"use server";

import { db } from "@/lib/db";
import {
  assertSameChannel,
  requireChannelById,
  requireMediaById,
  requirePlaylistById,
  requirePlaylistItemById,
} from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

/**
 * Create a new Playlist
 */
export async function createPlaylistAction(
  channelId: string,
  name: string,
  type: "SINGLE_RUN" | "LOOP",
  description?: string
) {
  try {
    await requireChannelById(channelId);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    
    await db.playlist.create({
      data: {
        channelId,
        name,
        slug,
        type,
        description: description || null,
        status: "ACTIVE",
      },
    });

    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Failed to create playlist:", error);
    throw new Error(error.message || "Failed to create playlist.");
  }
}

/**
 * Add a Media item to a Playlist
 */
export async function addPlaylistItemAction(playlistId: string, mediaId: string) {
  try {
    const playlist = await requirePlaylistById(playlistId);
    const media = await requireMediaById(mediaId);
    assertSameChannel(media.channelId, playlist.channelId, "Media");

    // Determine the next position
    const currentItemsCount = await db.playlistItem.count({
      where: { playlistId },
    });

    await db.playlistItem.create({
      data: {
        playlistId,
        mediaId,
        position: currentItemsCount + 1,
      },
    });

    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Failed to add playlist item:", error);
    throw new Error(error.message || "Failed to add playlist item.");
  }
}

/**
 * Remove an item from a Playlist and adjust remaining positions
 */
export async function removePlaylistItemAction(playlistId: string, itemId: string) {
  try {
    const playlist = await requirePlaylistById(playlistId);
    const deletedItem = await requirePlaylistItemById(itemId);
    if (deletedItem.playlistId !== playlist.id) {
      throw new Error("Playlist item does not belong to the selected playlist.");
    }

    await db.playlistItem.delete({
      where: { id: itemId },
    });

    // Re-adjust positions of remaining items
    const remainingItems = await db.playlistItem.findMany({
      where: { playlistId },
      orderBy: { position: "asc" },
    });

    for (let i = 0; i < remainingItems.length; i++) {
      await db.playlistItem.update({
        where: { id: remainingItems[i].id },
        data: { position: i + 1 },
      });
    }

    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Failed to remove item:", error);
    throw new Error(error.message || "Failed to remove item.");
  }
}

/**
 * Reorder items in a Playlist by position
 */
export async function reorderPlaylistItemsAction(playlistId: string, orderedItemIds: string[]) {
  try {
    await requirePlaylistById(playlistId);

    const items = await db.playlistItem.findMany({
      where: { playlistId },
      select: { id: true },
    });
    const itemIds = new Set(items.map((item) => item.id));

    if (orderedItemIds.length !== items.length || orderedItemIds.some((itemId) => !itemIds.has(itemId))) {
      throw new Error("Invalid playlist reorder payload.");
    }

    // Perform sequentially to avoid unique constraint violations
    // In schema, @@unique([playlistId, position]) is set. To safely reorder without violations:
    // First, map them to negative positions temporarily.
    for (let i = 0; i < orderedItemIds.length; i++) {
      await db.playlistItem.update({
        where: { id: orderedItemIds[i] },
        data: { position: -(i + 1) },
      });
    }

    // Second, set them to their correct final positive positions
    for (let i = 0; i < orderedItemIds.length; i++) {
      await db.playlistItem.update({
        where: { id: orderedItemIds[i] },
        data: { position: i + 1 },
      });
    }

    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Failed to reorder playlist items:", error);
    throw new Error(error.message || "Reorder execution failed.");
  }
}

/**
 * Duplicate an existing Playlist
 */
export async function duplicatePlaylistAction(playlistId: string) {
  try {
    const source = await db.playlist.findUnique({
      where: { id: playlistId },
      include: { items: true },
    });

    if (!source) throw new Error("Source playlist not found.");

    const name = `${source.name} (Copy)`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const copy = await db.playlist.create({
      data: {
        channelId: source.channelId,
        name,
        slug,
        type: source.type,
        description: source.description,
        status: "ACTIVE",
      },
    });

    // Duplicate items
    for (const item of source.items) {
      await db.playlistItem.create({
        data: {
          playlistId: copy.id,
          mediaId: item.mediaId,
          position: item.position,
          startOffsetSec: item.startOffsetSec,
          endOffsetSec: item.endOffsetSec,
        },
      });
    }

    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Duplicate playlist failed:", error);
    throw new Error(error.message || "Failed to duplicate.");
  }
}

/**
 * Archive a Playlist
 */
export async function archivePlaylistAction(playlistId: string) {
  try {
    await requirePlaylistById(playlistId);
    await db.playlist.update({
      where: { id: playlistId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });
    revalidatePath("/playlists");
  } catch (error: any) {
    console.error("Failed to archive playlist:", error);
    throw new Error(error.message || "Archive failed.");
  }
}
