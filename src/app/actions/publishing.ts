"use server";

import { db } from "@/lib/db";
import {
  assertSameChannel,
  requireChannelById,
  requireMediaById,
} from "@/lib/auth-guard";
import { uploadYoutubeVideo, uploadYoutubeThumbnail } from "@/lib/youtube";
import { revalidatePath } from "next/cache";

interface PublishParams {
  channelId: string;
  mediaId: string;
  thumbnailMediaId?: string | null;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  pinnedComment?: string | null;
  privacy: "PUBLIC" | "PRIVATE" | "UNLISTED";
  categoryId?: string | null;
  scheduledFor?: Date | null;
}

/**
 * Handle YouTube video uploading and publishing flow
 */
export async function publishVideoAction(params: PublishParams) {
  await requireChannelById(params.channelId);

  const media = await requireMediaById(params.mediaId);
  assertSameChannel(media.channelId, params.channelId, "Media");

  if (params.thumbnailMediaId) {
    const thumbnail = await requireMediaById(params.thumbnailMediaId);
    assertSameChannel(thumbnail.channelId, params.channelId, "Thumbnail");
  }

  // Create YouTubeUpload record in DB as UPLOADING
  const uploadRecord = await db.youTubeUpload.create({
    data: {
      channelId: params.channelId,
      mediaId: params.mediaId,
      thumbnailMediaId: params.thumbnailMediaId || null,
      title: params.title,
      description: params.description,
      tags: params.tags,
      hashtags: params.hashtags,
      pinnedComment: params.pinnedComment || null,
      privacy: params.privacy,
      categoryId: params.categoryId || "22",
      scheduledFor: params.scheduledFor || null,
      status: "UPLOADING",
    },
  });

  try {
    revalidatePath("/publishing");
    revalidatePath("/");

    // 1. Upload video
    const uploadRes = await uploadYoutubeVideo(
      params.channelId,
      media.storagePath,
      {
        title: params.title,
        description: params.description,
        privacy: params.privacy,
        tags: params.tags,
        categoryId: params.categoryId || "22",
      }
    );

    const youtubeVideoId = uploadRes.id!;

    // 2. Upload thumbnail if selected
    if (params.thumbnailMediaId) {
      const thumb = await requireMediaById(params.thumbnailMediaId);
      await uploadYoutubeThumbnail(params.channelId, youtubeVideoId, thumb.storagePath);
    }

    // 3. Mark as PUBLISHED in DB
    await db.youTubeUpload.update({
      where: { id: uploadRecord.id },
      data: {
        status: "PUBLISHED",
        youtubeVideoId,
        publishedAt: new Date(),
      },
    });

    revalidatePath("/publishing");
    revalidatePath("/");
    return { success: true, youtubeVideoId };

  } catch (error: any) {
    console.error("Publishing failure:", error);

    await db.youTubeUpload.update({
      where: { id: uploadRecord.id },
      data: {
        status: "FAILED",
        failureReason: error.message || "Failed to upload to YouTube API.",
      },
    });

    revalidatePath("/publishing");
    revalidatePath("/");
    return { success: false, error: error.message || "Failed to publish." };
  }
}
