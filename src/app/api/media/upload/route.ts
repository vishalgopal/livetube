import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import { extractMediaMetadata } from "@/lib/metadata-extractor";

const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const channelId = formData.get("channelId") as string;
    const folderId = formData.get("folderId") as string;

    if (!file || !channelId) {
      return NextResponse.json({ error: "Missing file or channelId" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save file on disk
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;
    const storagePath = path.join(UPLOADS_DIR, uniqueFileName);
    fs.writeFileSync(storagePath, buffer);

    // Extract duration & resolution metadata
    const meta = await extractMediaMetadata(storagePath);

    // Resolve Media Type enum
    let type = "VIDEO";
    if (file.type.startsWith("audio/")) {
      type = "AUDIO";
    } else if (file.type.startsWith("image/")) {
      type = "IMAGE";
    }

    const dotIndex = file.name.lastIndexOf(".");
    const title = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const extension = dotIndex !== -1 ? file.name.substring(dotIndex + 1) : "";

    // Save to DB
    const media = await db.media.create({
      data: {
        channelId,
        folderId: folderId && folderId !== "root" ? folderId : null,
        type: type as any,
        title,
        originalFilename: file.name,
        storagePath,
        mimeType: file.type,
        extension,
        sizeBytes: BigInt(buffer.length),
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
