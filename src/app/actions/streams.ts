"use server";

import { db } from "@/lib/db";
import { requireStreamById, requireSession } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { completeYoutubeLiveBroadcast } from "@/lib/youtube";

/**
 * Request a stream start. The dedicated worker process picks this up and owns FFmpeg execution.
 */
export async function startStreamAction(streamId: string) {
  try {
    const stream = await requireStreamById(streamId);
    if (stream.status === "LIVE" || stream.status === "STARTING") {
      return;
    }

    await db.stream.update({
      where: { id: streamId },
      data: {
        status: "STARTING",
        actualStartAt: new Date(),
        actualEndAt: null,
        failureReason: null,
        ffmpegCommand: null,
      },
    });

    revalidatePath("/");
    revalidatePath("/studio");
    revalidatePath("/health");
    revalidatePath("/scheduler");
  } catch (error: any) {
    console.error(`Failed to start stream ${streamId}:`, error);
    throw new Error(error.message || "Failed to queue stream start.");
  }
}

/**
 * Request a stream stop. The worker process stops the underlying FFmpeg process.
 */
export async function stopStreamAction(streamId: string) {
  try {
    const stream = await requireStreamById(streamId);
    if (stream.status === "COMPLETED" || stream.status === "CANCELLED" || stream.status === "FAILED") {
      return;
    }

    if (stream.youtubeBroadcastId) {
      try {
        await completeYoutubeLiveBroadcast(stream.channelId, stream.youtubeBroadcastId);
      } catch (error: any) {
        console.error(`Failed to transition YouTube broadcast ${stream.youtubeBroadcastId} to complete:`, error);
      }
    }

    await db.stream.update({
      where: { id: streamId },
      data: {
        status: "COMPLETED",
        actualEndAt: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/studio");
    revalidatePath("/health");
    revalidatePath("/scheduler");
  } catch (error: any) {
    console.error(`Failed to stop stream ${streamId}:`, error);
    throw new Error(error.message || "Failed to queue stream stop.");
  }
}

/**
 * Mark stale streams for recovery. The worker process reclaims them on its next poll cycle.
 */
export async function runAutoRecoveryAction() {
  try {
    await requireSession();

    const staleBefore = new Date(Date.now() - 60 * 1000);
    await db.stream.updateMany({
      where: {
        status: { in: ["LIVE", "STARTING"] },
        OR: [
          { lastHeartbeatAt: null },
          { lastHeartbeatAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: "STARTING",
        ffmpegCommand: null,
        failureReason: "Manual recovery requested by operator.",
      },
    });

    revalidatePath("/");
    revalidatePath("/studio");
    revalidatePath("/health");
    revalidatePath("/scheduler");
  } catch (error: any) {
    console.error("Auto-recovery execution failed:", error);
    throw new Error(error.message || "Auto-recovery failed.");
  }
}
