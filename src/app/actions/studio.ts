"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSameChannel, requireChannelById, requireMediaById } from "@/lib/auth-guard";
import { createYoutubeLiveStream } from "@/lib/youtube";

interface StartQuickStreamParams {
  channelId: string;
  mediaId: string;
  thumbnailMediaId?: string | null;
  title: string;
  description?: string;
  categoryId?: string | null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export async function createQuickStreamAction(params: StartQuickStreamParams) {
  const channel = await requireChannelById(params.channelId);
  const media = await requireMediaById(params.mediaId);
  assertSameChannel(media.channelId, params.channelId, "Media");

  let thumbnailPath: string | null = null;
  if (params.thumbnailMediaId) {
    const thumbnail = await requireMediaById(params.thumbnailMediaId);
    assertSameChannel(thumbnail.channelId, params.channelId, "Thumbnail");
    if (thumbnail.type !== "IMAGE") {
      throw new Error("Thumbnail must be an image asset.");
    }
    thumbnailPath = thumbnail.storagePath;
  }

  if (media.type === "IMAGE") {
    throw new Error("Live streaming requires a video or audio media asset.");
  }

  const title = params.title.trim();
  const description = params.description?.trim() || "Live stream started from LiveTube Studio.";

  if (!title) {
    throw new Error("Stream title is required.");
  }

  if (channel.status !== "CONNECTED") {
    throw new Error("Connect the channel to YouTube before starting a live stream.");
  }

  const broadcast = await createYoutubeLiveStream(
    params.channelId,
    title,
    description,
    new Date(),
    {
      categoryId: params.categoryId?.trim() || "10",
      thumbnailPath,
    }
  );

  const playlist = await db.playlist.create({
    data: {
      channelId: params.channelId,
      name: `${title} Source`,
      slug: `${slugify(`${title}-${Date.now()}`)}-source`,
      type: "SINGLE_RUN",
      description: "Auto-generated quick stream playlist.",
      status: "ACTIVE",
    },
  });

  await db.playlistItem.create({
    data: {
      playlistId: playlist.id,
      mediaId: media.id,
      position: 1,
    },
  });

  const stream = await db.stream.create({
    data: {
      channelId: params.channelId,
      playlistId: playlist.id,
      currentMediaId: media.id,
      thumbnailMediaId: params.thumbnailMediaId || null,
      categoryId: params.categoryId?.trim() || "10",
      title,
      description,
      scheduledStartAt: new Date(),
      status: "SCHEDULED",
      autoRecoveryEnabled: false,
      youtubeBroadcastId: broadcast.broadcastId,
      youtubeLiveStreamId: broadcast.liveStreamId,
      streamKeyOverride: broadcast.streamKey,
    },
  });

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePath("/health");

  return { success: true, streamId: stream.id };
}

export async function startQuickStreamAction(params: StartQuickStreamParams) {
  const result = await createQuickStreamAction(params);

  await db.stream.update({
    where: { id: result.streamId },
    data: {
      status: "STARTING",
      actualStartAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/studio");
  revalidatePath("/health");

  return result;
}
