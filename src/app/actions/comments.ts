"use server";

import { db } from "@/lib/db";
import { fetchYoutubeComments, replyToYoutubeComment, deleteYoutubeComment } from "@/lib/youtube";
import { revalidatePath } from "next/cache";

/**
 * Sync comments from YouTube Data API into the local DB.
 */
export async function syncCommentsAction(channelId: string) {
  try {
    const rawComments = await fetchYoutubeComments(channelId);

    for (const item of rawComments) {
      const extCommentId = item.id!;
      const commentSnippet = item.snippet?.topLevelComment?.snippet;
      if (!commentSnippet) continue;

      await db.comment.upsert({
        where: { externalCommentId: extCommentId },
        update: {
          bodyText: commentSnippet.textDisplay || "",
          authorDisplayName: commentSnippet.authorDisplayName || "Anonymous",
          publishedAt: new Date(commentSnippet.publishedAt || Date.now()),
        },
        create: {
          channelId,
          externalCommentId: extCommentId,
          authorChannelId: commentSnippet.authorChannelId?.value || null,
          authorDisplayName: commentSnippet.authorDisplayName || "Anonymous",
          bodyText: commentSnippet.textDisplay || "",
          publishedAt: new Date(commentSnippet.publishedAt || Date.now()),
          status: "NEW",
        },
      });
    }

    revalidatePath("/moderation");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Comments sync failed:", error);
    throw new Error(error.message || "Failed to fetch comment threads from YouTube.");
  }
}

/**
 * Reply to a comment, updating local DB status.
 */
export async function replyToCommentAction(channelId: string, commentId: string, threadId: string, text: string) {
  try {
    await replyToYoutubeComment(channelId, threadId, text);
    
    await db.comment.update({
      where: { id: commentId },
      data: {
        status: "REPLIED",
        repliedAt: new Date(),
      },
    });

    revalidatePath("/moderation");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to reply to comment:", error);
    throw new Error(error.message || "Reply failed.");
  }
}

/**
 * Delete/Moderate a comment.
 */
export async function deleteCommentAction(channelId: string, commentId: string, externalId: string) {
  try {
    await deleteYoutubeComment(channelId, externalId);

    await db.comment.update({
      where: { id: commentId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
      },
    });

    revalidatePath("/moderation");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to delete comment:", error);
    throw new Error(error.message || "Delete failed.");
  }
}

/**
 * Approve a comment (mark as APPROVED)
 */
export async function approveCommentAction(commentId: string) {
  try {
    await db.comment.update({
      where: { id: commentId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    revalidatePath("/moderation");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to approve comment:", error);
    throw new Error(error.message || "Approve failed.");
  }
}

/**
 * Flag comment as Spam
 */
export async function flagCommentSpamAction(commentId: string) {
  try {
    await db.comment.update({
      where: { id: commentId },
      data: {
        status: "SPAM",
        isSpam: true,
      },
    });

    revalidatePath("/moderation");
    revalidatePath("/");
  } catch (error: any) {
    console.error("Failed to flag spam:", error);
    throw new Error(error.message || "Spam flag failed.");
  }
}
