import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameChannel, requireChannelById, requireFolderById, requireSession } from "@/lib/auth-guard";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { extractMediaMetadata } from "@/lib/metadata-extractor";

const Busboy: any = require("next/dist/compiled/busboy");

const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const runtime = "nodejs";

interface ParsedUpload {
  channelId: string;
  folderId: string;
  file: {
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
  };
}

async function parseMultipartUpload(request: NextRequest): Promise<ParsedUpload> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    throw new Error("Upload request must use multipart/form-data.");
  }

  if (!request.body) {
    throw new Error("Upload request body is missing.");
  }

  const headers = Object.fromEntries(request.headers.entries());
  const busboy = Busboy({ headers });

  const fields: Record<string, string> = {};
  let uploadedFile: ParsedUpload["file"] | null = null;
  let uploadWritePromise: Promise<void> | null = null;
  let writeStream: fs.WriteStream | null = null;
  let currentStoragePath: string | null = null;

  const cleanupPartialFile = () => {
    if (writeStream && !writeStream.destroyed) {
      writeStream.destroy();
    }

    if (currentStoragePath && fs.existsSync(currentStoragePath)) {
      try {
        fs.unlinkSync(currentStoragePath);
      } catch (_) {}
    }
  };

  await new Promise<void>((resolve, reject) => {
    const rejectWithCleanup = (error: Error) => {
      cleanupPartialFile();
      reject(error);
    };

    busboy.on("field", (name: string, value: string) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldName: string, fileStream: NodeJS.ReadableStream, infoA: any, infoB?: any, infoC?: any) => {
      if (fieldName !== "file") {
        fileStream.resume();
        return;
      }

      const info =
        typeof infoA === "object" && infoA !== null
          ? infoA
          : {
              filename: infoA,
              encoding: infoB,
              mimeType: infoC,
              mime: infoC,
            };

      const originalFilename = String(info.filename || "upload.bin");
      const mimeType = String(info.mimeType || info.mime || "application/octet-stream");
      const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${Date.now()}_${sanitizedName}`;
      const storagePath = path.join(UPLOADS_DIR, uniqueFileName);
      writeStream = fs.createWriteStream(storagePath);
      currentStoragePath = storagePath;
      let sizeBytes = 0;

      uploadedFile = {
        originalFilename,
        storagePath,
        mimeType,
        sizeBytes: 0,
      };

      fileStream.on("data", (chunk: Buffer) => {
        sizeBytes += chunk.length;
      });

      fileStream.on("error", (error) => {
        writeStream?.destroy(error as Error);
      });

      uploadWritePromise = new Promise<void>((writeResolve, writeReject) => {
        writeStream?.on("finish", () => {
          if (uploadedFile) {
            uploadedFile.sizeBytes = sizeBytes;
          }
          writeStream = null;
          currentStoragePath = null;
          writeResolve();
        });
        writeStream?.on("error", writeReject);
      });

      fileStream.pipe(writeStream);
    });

    busboy.on("error", (error: Error) => {
      if (error.message.includes("Unexpected end of form")) {
        rejectWithCleanup(
          new Error(
            "Upload was interrupted before the full file reached the server. This is usually a proxy or request-size limit."
          )
        );
        return;
      }

      rejectWithCleanup(error);
    });
    busboy.on("finish", resolve);

    request.signal.addEventListener("abort", () => {
      rejectWithCleanup(
        new Error("Upload request was aborted before completion.")
      );
    });

    Readable.fromWeb(request.body as any).pipe(busboy);
  });

  if (uploadWritePromise) {
    try {
      await uploadWritePromise;
    } catch (error: any) {
      cleanupPartialFile();
      throw new Error(error.message || "Failed to persist uploaded file.");
    }
  }

  if (!uploadedFile) {
    throw new Error("No file was received in the upload request.");
  }

  return {
    channelId: fields.channelId || "",
    folderId: fields.folderId || "",
    file: uploadedFile,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const upload = await parseMultipartUpload(request);
    const { file, channelId, folderId } = upload;

    if (!channelId) {
      return NextResponse.json({ error: "Missing file or channelId" }, { status: 400 });
    }

    await requireChannelById(channelId);

    if (folderId && folderId !== "root") {
      const folder = await requireFolderById(folderId);
      assertSameChannel(folder.channelId, channelId, "Folder");
    }

    // Extract duration & resolution metadata
    const meta = await extractMediaMetadata(file.storagePath);

    // Resolve Media Type enum
    let type = "VIDEO";
    if (file.mimeType.startsWith("audio/")) {
      type = "AUDIO";
    } else if (file.mimeType.startsWith("image/")) {
      type = "IMAGE";
    }

    const dotIndex = file.originalFilename.lastIndexOf(".");
    const title = dotIndex !== -1 ? file.originalFilename.substring(0, dotIndex) : file.originalFilename;
    const extension = dotIndex !== -1 ? file.originalFilename.substring(dotIndex + 1) : "";

    // Save to DB
    const media = await db.media.create({
      data: {
        channelId,
        folderId: folderId && folderId !== "root" ? folderId : null,
        type: type as any,
        title,
        originalFilename: file.originalFilename,
        storagePath: file.storagePath,
        mimeType: file.mimeType,
        extension,
        sizeBytes: BigInt(file.sizeBytes),
        durationSeconds: meta.durationSeconds,
        width: meta.width,
        height: meta.height,
        status: "READY",
      },
    });

    // Serialize BigInt to prevent json crashes
    const serializedMedia = {
      ...media,
      sizeBytes: media.sizeBytes.toString(),
    };

    return NextResponse.json({ success: true, media: serializedMedia });
  } catch (error: any) {
    console.error("Upload endpoint error:", error);
    return NextResponse.json({ error: error.message || "Upload handler failed." }, { status: 500 });
  }
}
