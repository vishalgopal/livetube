import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveChannelContext } from "@/lib/channel-access";
import {
  MessageSquare,
  Check,
  AlertOctagon,
  Trash2,
  CornerDownRight,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import {
  syncCommentsAction,
  replyToCommentAction,
  deleteCommentAction,
  approveCommentAction,
  flagCommentSpamAction,
} from "@/app/actions/comments";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { activeChannel } = await getActiveChannelContext();

  if (!activeChannel) {
    return <div className="text-mute">No channel selected.</div>;
  }

  const { filter } = await searchParams;
  const currentFilter = filter || "new";

  // Resolve status query mapped to DB CommentStatus
  let dbStatus: any = "NEW";
  if (currentFilter === "replied") dbStatus = "REPLIED";
  if (currentFilter === "spam") dbStatus = "SPAM";
  if (currentFilter === "approved") dbStatus = "APPROVED";

  // Fetch comments counts for badges
  const newCount = await db.comment.count({ where: { channelId: activeChannel.id, status: "NEW" } });
  const repliedCount = await db.comment.count({ where: { channelId: activeChannel.id, status: "REPLIED" } });
  const spamCount = await db.comment.count({ where: { channelId: activeChannel.id, status: "SPAM" } });

  // Fetch comments listing
  const comments = await db.comment.findMany({
    where: {
      channelId: activeChannel.id,
      status: dbStatus,
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Comment Moderation</h1>
          <p className="text-sm text-mute">
            Moderate and reply to user feedback on YouTube channels for {activeChannel.name}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await syncCommentsAction(activeChannel!.id);
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hairline bg-canvas hover:bg-canvas-soft text-xs font-semibold text-body transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Comments
          </button>
        </form>
      </div>

      {/* Stats and filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-hairline pb-2.5">
        <Link
          href="/moderation?filter=new"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            currentFilter === "new"
              ? "bg-primary text-on-primary"
              : "bg-canvas border border-hairline text-body hover:bg-canvas-soft"
          }`}
        >
          Unmoderated
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              currentFilter === "new" ? "bg-on-primary/20 text-on-primary" : "bg-canvas-soft-2 text-mute"
            }`}
          >
            {newCount}
          </span>
        </Link>

        <Link
          href="/moderation?filter=replied"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            currentFilter === "replied"
              ? "bg-primary text-on-primary"
              : "bg-canvas border border-hairline text-body hover:bg-canvas-soft"
          }`}
        >
          Replied
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              currentFilter === "replied" ? "bg-on-primary/20 text-on-primary" : "bg-canvas-soft-2 text-mute"
            }`}
          >
            {repliedCount}
          </span>
        </Link>

        <Link
          href="/moderation?filter=spam"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            currentFilter === "spam"
              ? "bg-primary text-on-primary"
              : "bg-canvas border border-hairline text-body hover:bg-canvas-soft"
          }`}
        >
          Spam
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              currentFilter === "spam" ? "bg-on-primary/20 text-on-primary" : "bg-canvas-soft-2 text-mute"
            }`}
          >
            {spamCount}
          </span>
        </Link>
      </div>

      {/* Main Comment feed list */}
      <div className="flex flex-col gap-4">
        {comments.length === 0 ? (
          <div className="p-12 text-center border border-hairline rounded-xl bg-canvas text-mute text-sm font-medium">
            No comments in this section. Click &quot;Sync Comments&quot; to fetch the latest threads.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4"
            >
              {/* Commenter Info */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center text-mute">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-ink">{comment.authorDisplayName}</span>
                    <span className="text-[10px] text-mute font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(comment.publishedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Moderation Controls */}
                <div className="flex items-center gap-1">
                  {comment.status === "NEW" && (
                    <>
                      <form
                        action={async () => {
                          "use server";
                          await approveCommentAction(comment.id);
                        }}
                      >
                        <button
                          type="submit"
                          title="Approve"
                          className="p-1.5 rounded hover:bg-canvas-soft-2 text-mute hover:text-success transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </form>

                      <form
                        action={async () => {
                          "use server";
                          await flagCommentSpamAction(comment.id);
                        }}
                      >
                        <button
                          type="submit"
                          title="Spam"
                          className="p-1.5 rounded hover:bg-canvas-soft-2 text-mute hover:text-warning-deep transition-colors cursor-pointer"
                        >
                          <AlertOctagon className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  )}

                  <form
                    action={async () => {
                      "use server";
                      await deleteCommentAction(activeChannel!.id, comment.id, comment.externalCommentId);
                    }}
                  >
                    <button
                      type="submit"
                      title="Delete Comment"
                      className="p-1.5 rounded hover:bg-canvas-soft-2 text-mute hover:text-error-deep transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-sm text-body leading-relaxed bg-canvas-soft-2 p-3 rounded-lg border border-hairline font-sans italic">
                &quot;{comment.bodyText}&quot;
              </p>

              {/* Inline Reply Form */}
              {comment.status === "NEW" && (
                <form
                  action={async (formData) => {
                    "use server";
                    const replyText = formData.get("replyText") as string;
                    if (replyText) {
                      await replyToCommentAction(
                        activeChannel!.id,
                        comment.id,
                        comment.externalCommentId,
                        replyText
                      );
                    }
                  }}
                  className="flex gap-2 items-end mt-1 border-t border-hairline pt-3"
                >
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      name="replyText"
                      placeholder="Write YouTube reply..."
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" /> Reply
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
