import { db } from "@/lib/db";
import { getActiveChannelContext } from "@/lib/channel-access";
import { CheckCircle2, AlertCircle, RefreshCw, Film } from "lucide-react";
import PublishingForm from "@/components/publishing-form";

export default async function PublishingPage() {
  const { activeChannel } = await getActiveChannelContext();

  if (!activeChannel) {
    return <div className="text-mute">No channel selected.</div>;
  }

  const channelId = activeChannel.id;

  // Fetch media files
  const videos = await db.media.findMany({
    where: { channelId, type: "VIDEO" },
    orderBy: { uploadedAt: "desc" },
  });

  const images = await db.media.findMany({
    where: { channelId, type: "IMAGE" },
    orderBy: { uploadedAt: "desc" },
  });

  // Fetch YouTube uploads log
  const uploadsHistory = await db.youTubeUpload.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Publishing</h1>
        <p className="text-sm text-mute">
          Upload media directly to YouTube from VPS storage for {activeChannel.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        {/* Left Column Publish settings form */}
        <div className="lg:col-span-2">
          <PublishingForm
            channelId={channelId}
            videos={videos.map((v) => ({ id: v.id, title: v.title }))}
            images={images.map((img) => ({ id: img.id, title: img.title }))}
          />
        </div>

        {/* Right Column Upload History */}
        <div className="lg:col-span-1 p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
            Upload History
          </span>

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {uploadsHistory.length === 0 ? (
              <span className="text-xs text-mute font-medium">No uploads triggered yet.</span>
            ) : (
              uploadsHistory.map((history) => (
                <div
                  key={history.id}
                  className="p-3 bg-canvas-soft-2 rounded-lg border border-hairline flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <span className="text-xs font-bold text-ink truncate min-w-0 flex-1" title={history.title}>
                      {history.title}
                    </span>
                    <span className="text-[10px] text-mute font-mono shrink-0">
                      {new Date(history.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                    {history.status === "PUBLISHED" && (
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Published
                      </span>
                    )}
                    {history.status === "FAILED" && (
                      <span className="text-error-deep flex items-center gap-1" title={history.failureReason || ""}>
                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                    {history.status === "UPLOADING" && (
                      <span className="text-link flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading
                      </span>
                    )}
                    {history.status === "PROCESSING" && (
                      <span className="text-warning-deep flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing
                      </span>
                    )}
                  </div>

                  {history.youtubeVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${history.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-link hover:underline font-mono flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      View on YouTube <Film className="w-3 h-3" />
                    </a>
                  )}

                  {history.status === "FAILED" && history.failureReason && (
                    <span className="text-[10px] text-error-deep bg-error-soft/10 p-1.5 rounded-sm border border-error-soft/20 break-words mt-1">
                      {history.failureReason}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
