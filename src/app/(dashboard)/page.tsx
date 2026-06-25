import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSystemMetrics } from "@/lib/system-monitor";
import { startStreamAction, stopStreamAction } from "@/app/actions/streams";
import { syncCommentsAction } from "@/app/actions/comments";
import {
  Video,
  ListMusic,
  MessageSquare,
  Activity,
  Play,
  Square,
  RefreshCw,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  ExternalLink,
  Plus,
} from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  // Resolve active channel context
  const channels = await db.channel.findMany({
    orderBy: { name: "asc" },
  });

  let activeChannel = channels.find((c) => c.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  // Handle case with no channels seeded
  if (!activeChannel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center bg-canvas border border-hairline rounded-xl">
        <Video className="w-12 h-12 text-mute" />
        <h2 className="text-xl font-bold text-ink">No Channels Available</h2>
        <p className="text-sm text-mute max-w-sm">
          Please run the database seed script to initialize the default Bhakti and RaagaX channels.
        </p>
        <code className="px-3 py-1.5 rounded-lg bg-canvas-soft-2 border border-hairline font-mono text-xs text-body">
          npm run prisma:seed
        </code>
      </div>
    );
  }

  const channelId = activeChannel.id;

  // Fetch Stats
  const mediaCount = await db.media.count({ where: { channelId } });
  const playlistCount = await db.playlist.count({ where: { channelId } });
  const pendingCommentsCount = await db.comment.count({ where: { channelId, status: "NEW" } });
  const liveStreamsCount = await db.stream.count({ where: { channelId, status: "LIVE" } });

  // Fetch Live Streams
  const liveStreams = await db.stream.findMany({
    where: { channelId, status: "LIVE" },
    include: { playlist: true },
    orderBy: { actualStartAt: "desc" },
  });

  // Fetch Upcoming Streams
  const upcomingStreams = await db.stream.findMany({
    where: { channelId, status: "SCHEDULED" },
    orderBy: { scheduledStartAt: "asc" },
    take: 5,
  });

  // Fetch Recent Media
  const recentMedia = await db.media.findMany({
    where: { channelId },
    orderBy: { uploadedAt: "desc" },
    take: 6,
  });

  // Fetch Recent Comments
  const recentComments = await db.comment.findMany({
    where: { channelId, status: "NEW" },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  // Fetch System Metrics
  const system = await getSystemMetrics();

  // Channel Connection status check
  const isDisconnected = activeChannel.status === "DISCONNECTED" || activeChannel.status === "TOKEN_EXPIRED";

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Page Title & Quick Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Dashboard</h1>
          <p className="text-sm text-mute">Control panel overview for {activeChannel.name}</p>
        </div>

        {/* Sync comments form */}
        <div className="flex items-center gap-2">
          {!isDisconnected && (
            <form action={async () => {
              "use server";
              await syncCommentsAction(channelId);
            }}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hairline bg-canvas hover:bg-canvas-soft text-xs font-semibold text-body transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync YouTube
              </button>
            </form>
          )}
          
          <Link
            href="/publishing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Upload
          </Link>
        </div>
      </div>

      {/* OAuth Action Banner if disconnected */}
      {isDisconnected && (
        <div className="p-5 border border-warning-soft bg-warning-soft/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-warning-deep">YouTube Channel Connection Required</span>
            <span className="text-xs text-body">
              This channel context is currently disconnected. Connect or reconnect your Google Account to enable publishing and livestreaming.
            </span>
          </div>
          <Link
            href={`/api/youtube/oauth/connect?channelSlug=${activeChannel.slug}`}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning-deep hover:bg-warning-deep/90 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Connect Channel <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-2">
          <span className="text-xs text-mute font-medium uppercase font-mono tracking-wider">Live Streams</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">{liveStreamsCount}</span>
            <span className={`w-2 h-2 rounded-full ${liveStreamsCount > 0 ? "bg-link animate-pulse" : "bg-mute"}`} />
          </div>
        </div>

        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-2">
          <span className="text-xs text-mute font-medium uppercase font-mono tracking-wider">Media Assets</span>
          <span className="text-3xl font-extrabold text-ink">{mediaCount}</span>
        </div>

        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-2">
          <span className="text-xs text-mute font-medium uppercase font-mono tracking-wider">Playlists</span>
          <span className="text-3xl font-extrabold text-ink">{playlistCount}</span>
        </div>

        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-2">
          <span className="text-xs text-mute font-medium uppercase font-mono tracking-wider">Pending Comments</span>
          <span className="text-3xl font-extrabold text-ink">{pendingCommentsCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {/* Active Streams */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-link animate-pulse" />
              Live Streams
            </h2>
            {liveStreams.length === 0 ? (
              <div className="p-6 bg-canvas border border-hairline rounded-xl text-center text-sm text-mute font-medium">
                No active streams right now. Start an upcoming stream below.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {liveStreams.map((stream) => (
                  <div key={stream.id} className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-ink text-sm sm:text-base">{stream.title}</span>
                      <div className="flex items-center gap-4 text-xs text-mute">
                        <span className="flex items-center gap-1">
                          <ListMusic className="w-3.5 h-3.5" /> {stream.playlist?.name || "No Playlist"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Started: {stream.actualStartAt?.toLocaleTimeString() || "Just now"}
                        </span>
                      </div>
                    </div>
                    <form action={async () => {
                      "use server";
                      await stopStreamAction(stream.id);
                    }}>
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-error-soft hover:bg-error-soft/10 text-xs font-semibold text-error-deep transition-colors cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop Stream
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Schedule */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink">Upcoming Scheduled Broadcasts</h2>
            {upcomingStreams.length === 0 ? (
              <div className="p-6 bg-canvas border border-hairline rounded-xl text-center text-sm text-mute font-medium">
                No streams scheduled. Go to Scheduler to create one.
              </div>
            ) : (
              <div className="bg-canvas border border-hairline rounded-xl divide-y divide-hairline overflow-hidden">
                {upcomingStreams.map((stream) => (
                  <div key={stream.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-ink text-sm truncate">{stream.title}</span>
                      <span className="text-xs text-mute">
                        Scheduled: {new Date(stream.scheduledStartAt).toLocaleString()}
                      </span>
                    </div>
                    <form action={async () => {
                      "use server";
                      await startStreamAction(stream.id);
                    }}>
                      <button
                        type="submit"
                        disabled={isDisconnected}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-canvas border border-hairline hover:bg-canvas-soft text-xs font-semibold text-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Uploads */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Recent Media Uploads</h2>
              <Link href="/media" className="text-xs font-semibold text-link hover:underline">
                View All
              </Link>
            </div>
            {recentMedia.length === 0 ? (
              <div className="p-6 bg-canvas border border-hairline rounded-xl text-center text-sm text-mute font-medium">
                No uploads in media library yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {recentMedia.map((media) => (
                  <div key={media.id} className="border border-hairline rounded-lg bg-canvas overflow-hidden flex flex-col p-2.5 gap-2">
                    <div className="aspect-video bg-canvas-soft-2 rounded-md border border-hairline/50 relative flex items-center justify-center">
                      <Video className="w-5 h-5 text-mute" />
                      {media.durationSeconds && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                          {Math.floor(media.durationSeconds / 60)}:
                          {String(media.durationSeconds % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-ink truncate" title={media.title}>
                        {media.title}
                      </span>
                      <span className="text-[10px] text-mute font-mono">
                        {parseFloat((Number(media.sizeBytes) / 1024 / 1024).toFixed(1))} MB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Column */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Server Health */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink">Server Health</h2>
            <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
              {/* CPU */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-body">
                  <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> CPU Load</span>
                  <span>{system.cpuUsage}%</span>
                </div>
                <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${system.cpuUsage}%` }} />
                </div>
              </div>

              {/* Memory */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-body">
                  <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> RAM Utilization</span>
                  <span>{system.ramUsedGb} GB / {system.ramTotalGb} GB</span>
                </div>
                <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${system.ramUsage}%` }} />
                </div>
              </div>

              {/* Disk Space */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-body">
                  <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Storage (Disk)</span>
                  <span>{system.diskUsedGb} GB / {system.diskTotalGb} GB</span>
                </div>
                <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${system.diskUsage}%` }} />
                </div>
              </div>

              {/* Network */}
              <div className="flex items-center justify-between pt-2 border-t border-hairline text-xs font-semibold text-body">
                <span className="flex items-center gap-1 text-mute"><Wifi className="w-3.5 h-3.5" /> Net Bandwidth</span>
                <span className="font-mono text-ink">{system.bandwidthMbps} Mbps</span>
              </div>
            </div>
          </section>

          {/* Pending Comments */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Recent Comments</h2>
              <Link href="/moderation" className="text-xs font-semibold text-link hover:underline">
                Moderate
              </Link>
            </div>
            {recentComments.length === 0 ? (
              <div className="p-5 bg-canvas border border-hairline rounded-xl text-center text-xs text-mute font-medium">
                No new comments to moderate.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentComments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink truncate">{comment.authorDisplayName}</span>
                      <span className="text-[10px] text-mute font-mono">
                        {new Date(comment.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-body line-clamp-2 italic">
                      &quot;{comment.bodyText}&quot;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
