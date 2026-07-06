import fs from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { requireMediaById } from "@/lib/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const media = await requireMediaById(mediaId);

    if (!fs.existsSync(media.storagePath)) {
      return NextResponse.json({ error: "File not found on disk." }, { status: 404 });
    }

    const stream = fs.createReadStream(media.storagePath);
    const stat = fs.statSync(media.storagePath);

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": media.mimeType || "application/octet-stream",
        "Content-Length": String(stat.size),
        "Content-Disposition": `inline; filename="${media.originalFilename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to load media file." },
      { status: 500 }
    );
  }
}
