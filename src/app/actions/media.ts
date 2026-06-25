"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import fs from "fs";

/**
 * Create a new folder under a channel
 */
export async function createFolderAction(channelId: string, name: string, parentId?: string | null) {
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    
    // Resolve full path
    let folderPath = name;
    if (parentId) {
      const parent = await db.folder.findUnique({ where: { id: parentId } });
      if (parent) {
        folderPath = `${parent.path}/${name}`;
      }
    }

    await db.folder.create({
      data: {
        channelId,
        parentId: parentId || null,
        name,
        slug,
        path: folderPath,
      },
    });

    revalidatePath("/media");
  } catch (error: any) {
    console.error("Failed to create folder:", error);
    throw new Error(error.message || "Failed to create folder.");
  }
}

/**
 * Delete a media item and clean up physical file from disk
 */
export async function deleteMediaAction(mediaId: string) {
  try {
    const media = await db.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new Error("Media not found.");
    }

    // Delete DB record
    await db.media.delete({ where: { id: mediaId } });

    // Try deleting physical file
    if (fs.existsSync(media.storagePath)) {
      fs.unlinkSync(media.storagePath);
    }

    revalidatePath("/media");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to delete media:", error);
    throw new Error(error.message || "Failed to delete media.");
  }
}

/**
 * Rename a media item title
 */
export async function renameMediaAction(mediaId: string, newTitle: string) {
  try {
    await db.media.update({
      where: { id: mediaId },
      data: { title: newTitle },
    });
    revalidatePath("/media");
  } catch (error: any) {
    console.error("Failed to rename media:", error);
    throw new Error(error.message || "Rename failed.");
  }
}

/**
 * Move a media item into a folder
 */
export async function moveMediaAction(mediaId: string, folderId: string | null) {
  try {
    await db.media.update({
      where: { id: mediaId },
      data: { folderId: folderId === "root" ? null : folderId },
    });
    revalidatePath("/media");
  } catch (error: any) {
    console.error("Failed to move media:", error);
    throw new Error(error.message || "Move failed.");
  }
}
