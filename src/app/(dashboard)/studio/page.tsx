import { db } from "@/lib/db";
import { getActiveChannelContext } from "@/lib/channel-access";
import Link from "next/link";
import PublishingForm from "@/components/publishing-form";
import QuickStreamForm from "@/components/quick-stream-form";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import { startStreamAction, stopStreamAction } from "@/app/actions/streams";
import { Prisma } from "@prisma/client";
import { AlertCircle, CheckCircle2, PlayCircle, Radio, Square } from "lucide-react";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ reuseStreamId?: string; historyQuery?: string; historyPage?: string }>;
}) {
  const { activeChannel } = await getActiveChannelContext();

  if (!activeChannel) {
    return <div className="text-mute">No channel selected. Open Channels and connect one first.</div>;
  }

  const channelId = activeChannel.id;
  const videos = await db.media.findMany({
    where: {
      channelId,
      type: { in: ["VIDEO", "AUDIO"] },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const images = await db.media.findMany({
    where: { channelId, type: "IMAGE" },
    orderBy: { uploadedAt: "desc" },
  });

  const { reuseStreamId, historyQuery, historyPage } = await searchParams;
  const trimmedHistoryQuery = historyQuery?.trim() || "";
  const parsedHistoryPage = Number.parseInt(historyPage || "1", 10);
  const currentHistoryPage = Number.isFinite(parsedHistoryPage) && parsedHistoryPage > 0 ? parsedHistoryPage : 1;
  const historyPageSize = 10;

  const studioStreams = await db.stream.findMany({
    where: {
      channelId,
      status: { in: ["SCHEDULED", "LIVE", "STARTING", "COMPLETED", "FAILED", "CANCELLED"] },
    },
    include: {
      currentMedia: {
        select: {
          id: true,
          title: true,
        },
      },
      thumbnailMedia: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const streamToReuse =
    reuseStreamId
      ? studioStreams.find((stream) => stream.id === reuseStreamId) || null
      : null;

  const queueStreams = studioStreams.filter((stream) =>
    ["SCHEDULED", "LIVE", "STARTING"].includes(stream.status)
  );
  const recentStreams = studioStreams.filter((stream) =>
    ["COMPLETED", "FAILED", "CANCELLED"].includes(stream.status)
  );

  const recentStreamWhere: Prisma.StreamWhereInput = {
    channelId,
    status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
    ...(trimmedHistoryQuery
      ? {
          OR: [
            { title: { contains: trimmedHistoryQuery, mode: "insensitive" } },
            { description: { contains: trimmedHistoryQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [recentStreamsTotal, recentStreamsPage] = await Promise.all([
    db.stream.count({ where: recentStreamWhere }),
    db.stream.findMany({
      where: recentStreamWhere,
      orderBy: { createdAt: "desc" },
      skip: (currentHistoryPage - 1) * historyPageSize,
      take: historyPageSize,
    }),
  ]);

  const totalHistoryPages = Math.max(1, Math.ceil(recentStreamsTotal / historyPageSize));
  const safeHistoryPage = Math.min(currentHistoryPage, totalHistoryPages);

  const recentStreamsForPage =
    safeHistoryPage === currentHistoryPage
      ? recentStreamsPage
      : await db.stream.findMany({
          where: recentStreamWhere,
          orderBy: { createdAt: "desc" },
          skip: (safeHistoryPage - 1) * historyPageSize,
          take: historyPageSize,
        });

  const makeHistoryHref = (page: number) => {
    const params = new URLSearchParams();
    if (reuseStreamId) {
      params.set("reuseStreamId", reuseStreamId);
    }
    if (trimmedHistoryQuery) {
      params.set("historyQuery", trimmedHistoryQuery);
    }
    if (page > 1) {
      params.set("historyPage", String(page));
    }
    const query = params.toString();
    return query ? `/studio?${query}` : "/studio";
  };

  const uploadsHistory = await db.youTubeUpload.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Studio</h1>
        <p className="text-sm text-mute">
          Create the live stream first, then start it here when you are ready. No YouTube Studio tab needed for {activeChannel.name}.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-canvas-soft/40 p-4 text-sm text-body">
        <span className="font-semibold text-ink">Important:</span> the <span className="font-semibold text-ink">Start Stream</span> button only queues the stream.
        A worker process must be running to pick it up and move it to <span className="font-semibold text-ink">LIVE</span>.
        For local testing, run <code className="mx-1 rounded bg-canvas-soft-2 px-1.5 py-0.5 text-xs">npm run worker:streams</code>
        in a second terminal.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <QuickStreamForm
          channelId={channelId}
          videos={videos.map((video) => ({ id: video.id, title: video.title }))}
          images={images.map((image) => ({ id: image.id, title: image.title }))}
          initialValues={
            streamToReuse
              ? {
                  streamId: streamToReuse.id,
                  mediaId: streamToReuse.currentMediaId || undefined,
                  thumbnailMediaId: streamToReuse.thumbnailMediaId || undefined,
                  title: streamToReuse.title,
                  description: streamToReuse.description || "",
                  categoryId: streamToReuse.categoryId || "10",
                }
              : null
          }
        />

        <PublishingForm
          channelId={channelId}
          videos={videos.filter((video) => video.type === "VIDEO").map((video) => ({ id: video.id, title: video.title }))}
          images={images.map((image) => ({ id: image.id, title: image.title }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-mute" />
            <span className="text-sm font-bold text-ink">Stream Queue</span>
          </div>

          <p className="text-xs text-mute">
            Create a stream above. It will appear here as ready, then you can start or stop it from the same place.
          </p>

          {queueStreams.length === 0 ? (
            <div className="text-sm text-mute">No prepared or live streams for this channel yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {queueStreams.map((stream) => (
                <div key={stream.id} className="p-4 rounded-xl border border-hairline bg-canvas-soft/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-ink">{stream.title}</span>
                      <span className="text-xs text-mute">
                        {stream.status === "SCHEDULED"
                          ? "Created and ready to start"
                          : stream.status === "LIVE"
                          ? "Streaming now"
                          : "Starting stream"}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      stream.status === "LIVE"
                        ? "bg-link-bg-soft text-link-deep border border-link"
                        : stream.status === "STARTING"
                        ? "bg-warning-soft/40 text-warning-deep border border-warning-soft"
                        : "bg-canvas-soft-2 text-mute border border-hairline"
                    }`}>
                      {stream.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {stream.status === "SCHEDULED" && (
                      <form action={async () => {
                        "use server";
                        await startStreamAction(stream.id);
                      }}>
                        <ConfirmSubmitButton
                          confirmMessage={`Start stream "${stream.title}" now?`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-sm font-semibold"
                        >
                          <PlayCircle className="w-4 h-4" /> Start Stream
                        </ConfirmSubmitButton>
                      </form>
                    )}

                    {(stream.status === "LIVE" || stream.status === "STARTING") && (
                      <form action={async () => {
                        "use server";
                        await stopStreamAction(stream.id);
                      }}>
                        <ConfirmSubmitButton
                          confirmMessage={`Stop stream "${stream.title}"? This will also end the YouTube broadcast.`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-error-soft hover:bg-error-soft/10 text-sm font-semibold text-error-deep"
                        >
                          <Square className="w-4 h-4 fill-current" /> Stop Stream
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>

                  {stream.status === "STARTING" && (
                    <span className="text-[11px] text-mute">
                      If this stays on STARTING, the stream worker is not running or failed to claim the job.
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-sm font-bold text-ink">Recent Uploads</span>
          {uploadsHistory.length === 0 ? (
            <div className="text-sm text-mute">No uploads yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {uploadsHistory.map((upload) => (
                <div key={upload.id} className="p-3 rounded-lg border border-hairline bg-canvas-soft/40 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{upload.title}</span>
                    <span className="text-[10px] text-mute font-mono">
                      {new Date(upload.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {upload.status === "PUBLISHED" && (
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Published
                      </span>
                    )}
                    {upload.status === "FAILED" && (
                      <span className="text-error-deep flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                    {upload.status !== "PUBLISHED" && upload.status !== "FAILED" && (
                      <span className="text-mute">{upload.status}</span>
                    )}
                  </div>
                  {upload.failureReason && (
                    <span className="text-[11px] text-error-deep">{upload.failureReason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-ink">Recent Stream History</span>
            <span className="text-[11px] text-mute">
              Search past streams and click one to reload its values into Create Live Stream.
            </span>
          </div>

          <form action="/studio" method="get" className="flex items-center gap-2 flex-wrap">
            {reuseStreamId && <input type="hidden" name="reuseStreamId" value={reuseStreamId} />}
            <input
              type="text"
              name="historyQuery"
              defaultValue={trimmedHistoryQuery}
              placeholder="Search title or description"
              className="w-64 max-w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-xs text-ink focus:outline-none focus:border-hairline-strong"
            />
            <input type="hidden" name="historyPage" value="1" />
            <button
              type="submit"
              className="rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft/60"
            >
              Search
            </button>
          </form>
        </div>

        {recentStreamsTotal === 0 ? (
          <div className="text-sm text-mute">No completed or failed streams yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-mute">
              <span>
                Showing page {safeHistoryPage} of {totalHistoryPages} ({recentStreamsTotal} total)
              </span>
              {trimmedHistoryQuery && <span>Filtered by: &quot;{trimmedHistoryQuery}&quot;</span>}
            </div>

            <div className="flex flex-col gap-3">
              {recentStreamsForPage.map((stream) => (
                <Link
                  key={stream.id}
                  href={`/studio?${(() => {
                    const params = new URLSearchParams();
                    params.set("reuseStreamId", stream.id);
                    if (trimmedHistoryQuery) {
                      params.set("historyQuery", trimmedHistoryQuery);
                    }
                    if (safeHistoryPage > 1) {
                      params.set("historyPage", String(safeHistoryPage));
                    }
                    return params.toString();
                  })()}`}
                  className="p-4 rounded-xl border border-hairline bg-canvas-soft/40 flex items-start justify-between gap-3 transition-colors hover:border-hairline-strong hover:bg-canvas-soft/70"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-ink">{stream.title}</span>
                    <span className="text-xs text-mute">
                      {stream.status === "COMPLETED"
                        ? "Stopped from panel"
                        : stream.status === "FAILED"
                        ? "Failed to start or crashed"
                        : "Cancelled"}
                    </span>
                    <span className="text-[11px] text-link">Click to load these values into Create Live Stream.</span>
                    {stream.failureReason && (
                      <span className="text-[11px] text-error-deep">{stream.failureReason}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-mute">{stream.status}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              {safeHistoryPage > 1 ? (
                <a
                  href={makeHistoryHref(safeHistoryPage - 1)}
                  className="rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft/60"
                >
                  Previous
                </a>
              ) : (
                <span className="rounded-lg border border-hairline bg-canvas-soft/30 px-3 py-2 text-xs font-semibold text-mute">
                  Previous
                </span>
              )}

              <div className="flex items-center gap-2 text-xs text-mute">
                <span>Page {safeHistoryPage}</span>
                <span>/</span>
                <span>{totalHistoryPages}</span>
              </div>

              {safeHistoryPage < totalHistoryPages ? (
                <a
                  href={makeHistoryHref(safeHistoryPage + 1)}
                  className="rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas-soft/60"
                >
                  Next
                </a>
              ) : (
                <span className="rounded-lg border border-hairline bg-canvas-soft/30 px-3 py-2 text-xs font-semibold text-mute">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
