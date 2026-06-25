"use server";

import { db } from "@/lib/db";
import { createYoutubeLiveStream } from "@/lib/youtube";
import { revalidatePath } from "next/cache";

interface ScheduleParams {
  channelId: string;
  title: string;
  playlistId: string;
  scheduledStartAt: Date;
  autoRecoveryEnabled?: boolean;
}

/**
 * Schedule a new Live Stream broadcast on YouTube and save in DB
 */
export async function scheduleStreamAction(params: ScheduleParams) {
  try {
    // 1. Resolve channel status
    const channel = await db.channel.findUnique({
      where: { id: params.channelId },
    });

    if (!channel) throw new Error("Channel context not found.");

    // If channel is connected, we can attempt creating the broadcast on YouTube API
    let youtubeBroadcastId = null;
    let youtubeLiveStreamId = null;
    let streamKeyOverride = null;

    if (channel.status === "CONNECTED") {
      try {
        const broadcast = await createYoutubeLiveStream(
          params.channelId,
          params.title,
          "Live broadcast streamed via LiveTube VPS scheduler.",
          params.scheduledStartAt
        );

        youtubeBroadcastId = broadcast.broadcastId;
        youtubeLiveStreamId = broadcast.liveStreamId;
        streamKeyOverride = broadcast.streamKey;
      } catch (ytErr: any) {
        console.warn("Failed to schedule broadcast directly on YouTube, scheduling locally instead:", ytErr);
      }
    }

    // 2. Save in database
    await db.stream.create({
      data: {
        channelId: params.channelId,
        playlistId: params.playlistId,
        title: params.title,
        scheduledStartAt: params.scheduledStartAt,
        autoRecoveryEnabled: params.autoRecoveryEnabled ?? true,
        youtubeBroadcastId,
        youtubeLiveStreamId,
        streamKeyOverride,
        status: "SCHEDULED",
      },
    });

    revalidatePath("/scheduler");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Scheduling failed:", error);
    throw new Error(error.message || "Failed to schedule stream.");
  }
}

/**
 * Cancel a scheduled stream
 */
export async function cancelStreamAction(streamId: string) {
  try {
    await db.stream.update({
      where: { id: streamId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/scheduler");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Cancel stream failed:", error);
    throw new Error(error.message || "Cancel failed.");
  }
}

/**
 * Duplicate a stream schedule
 */
export async function duplicateStreamAction(streamId: string, newStartTime: Date) {
  try {
    const src = await db.stream.findUnique({ where: { id: streamId } });
    if (!src) throw new Error("Source stream not found.");

    await db.stream.create({
      data: {
        channelId: src.channelId,
        playlistId: src.playlistId,
        presetId: src.presetId,
        title: `${src.title} (Duplicate)`,
        scheduledStartAt: newStartTime,
        autoRecoveryEnabled: src.autoRecoveryEnabled,
        status: "SCHEDULED",
      },
    });

    revalidatePath("/scheduler");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to duplicate stream:", error);
    throw new Error(error.message || "Duplication failed.");
  }
}
