"use server";

import { ffmpegCoordinator } from "@/lib/ffmpeg-coordinator";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Start a stream by ID
 */
export async function startStreamAction(streamId: string) {
  try {
    await ffmpegCoordinator.startStream(streamId);
    revalidatePath("/");
    revalidatePath("/health");
    revalidatePath("/scheduler");
  } catch (error: any) {
    console.error(`Failed to start stream ${streamId}:`, error);
    throw new Error(error.message || "Failed to initiate FFmpeg stream.");
  }
}

/**
 * Stop an active stream by ID
 */
export async function stopStreamAction(streamId: string) {
  try {
    await ffmpegCoordinator.stopStream(streamId);
    revalidatePath("/");
    revalidatePath("/health");
    revalidatePath("/scheduler");
  } catch (error: any) {
    console.error(`Failed to stop stream ${streamId}:`, error);
    throw new Error(error.message || "Failed to terminate FFmpeg stream.");
  }
}

/**
 * Trigger active stream auto-recovery check
 */
export async function runAutoRecoveryAction() {
  try {
    await ffmpegCoordinator.recoverActiveStreams();
    revalidatePath("/");
    revalidatePath("/health");
  } catch (error: any) {
    console.error("Auto-recovery execution failed:", error);
    throw new Error(error.message || "Auto-recovery failed.");
  }
}
