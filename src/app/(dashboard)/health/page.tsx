import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSystemMetrics } from "@/lib/system-monitor";
import { runAutoRecoveryAction } from "@/app/actions/streams";
import {
  Activity,
  HardDrive,
  Cpu,
  Wifi,
  RefreshCw,
  Terminal,
  Clock,
  PlaySquare,
  AlertTriangle,
} from "lucide-react";

export default async function HealthPage() {
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  const channels = await db.channel.findMany({ orderBy: { name: "asc" } });
  let activeChannel = channels.find((c) => c.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  if (!activeChannel) {
    return <div className="text-mute">No channel selected.</div>;
  }

  const channelId = activeChannel.id;

  // System stats
  const system = await getSystemMetrics();

  // Fetch active live streams
  const liveStreams = await db.stream.findMany({
    where: { channelId, status: "LIVE" },
    include: {
      playlist: true,
      ffmpegLogs: {
        orderBy: { loggedAt: "desc" },
        take: 10,
      },
    },
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">System Health</h1>
          <p className="text-sm text-mute">
            Real-time VPS resources and active FFmpeg encoder diagnostics for {activeChannel.name}
          </p>
        </div>

        <form action={runAutoRecoveryAction}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Force Auto-Recovery
          </button>
        </form>
      </div>

      {/* Health gauges grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* CPU */}
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-soft-2 border border-hairline flex items-center justify-center text-mute shrink-0">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-mute font-mono uppercase tracking-wider">CPU Utilization</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-ink">{system.cpuUsage}%</span>
            <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${system.cpuUsage}%` }} />
            </div>
          </div>
        </div>

        {/* RAM */}
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-soft-2 border border-hairline flex items-center justify-center text-mute shrink-0">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-mute font-mono uppercase tracking-wider">RAM Usage</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-ink">{system.ramUsage}%</span>
            <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${system.ramUsage}%` }} />
            </div>
            <span className="text-[10px] text-mute font-medium">
              {system.ramUsedGb} GB used of {system.ramTotalGb} GB
            </span>
          </div>
        </div>

        {/* Storage Disk */}
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-soft-2 border border-hairline flex items-center justify-center text-mute shrink-0">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-mute font-mono uppercase tracking-wider">Disk Capacity</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-ink">{system.diskUsage}%</span>
            <div className="h-1.5 w-full bg-canvas-soft-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${system.diskUsage}%` }} />
            </div>
            <span className="text-[10px] text-mute font-medium">
              {system.diskUsedGb} GB used of {system.diskTotalGb} GB
            </span>
          </div>
        </div>

        {/* Network */}
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-soft-2 border border-hairline flex items-center justify-center text-mute shrink-0">
              <Wifi className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-mute font-mono uppercase tracking-wider">Net Bandwidth</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-3xl font-extrabold text-ink font-mono">{system.bandwidthMbps} Mbps</span>
            <span className="text-[10px] text-mute font-medium mt-1">
              Estimated upload usage ({system.activeStreamsCount} active feeds)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Active streams details list */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Activity className="w-5 h-5 text-mute" />
              Active Encoder Processes
            </h2>

            {liveStreams.length === 0 ? (
              <div className="p-8 text-center border border-hairline rounded-xl bg-canvas text-mute text-sm font-medium">
                No active streams are running.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {liveStreams.map((stream) => {
                  // Resolve latest stats
                  const latestStatLog = stream.ffmpegLogs.find((l) => l.eventType === "STATS");
                  const uptimeSeconds = latestStatLog?.uptimeSeconds || 0;
                  const totalHrs = Math.floor(uptimeSeconds / 3600);
                  const totalMins = Math.floor((uptimeSeconds % 3600) / 60);

                  return (
                    <div
                      key={stream.id}
                      className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-hairline">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink text-sm sm:text-base">{stream.title}</span>
                          <span className="text-[10px] text-mute font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Uptime: {totalHrs}h {totalMins}m
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-link-bg-soft border border-link text-[10px] font-bold text-link-deep font-mono uppercase tracking-wider animate-pulse">
                          LIVE
                        </span>
                      </div>

                      {/* STATS DETAILS */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-canvas-soft-2">
                          <span className="text-[10px] text-mute font-mono uppercase tracking-wider">Bitrate</span>
                          <span className="text-sm font-bold text-ink font-mono">
                            {latestStatLog?.bitrateKbps || 3000} kbps
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-canvas-soft-2">
                          <span className="text-[10px] text-mute font-mono uppercase tracking-wider">Frame Drops</span>
                          <span className="text-sm font-bold text-ink font-mono">0</span>
                        </div>
                        <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-canvas-soft-2">
                          <span className="text-[10px] text-mute font-mono uppercase tracking-wider">Auto Recovery</span>
                          <span className="text-sm font-bold text-ink">
                            {stream.autoRecoveryEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>

                      {/* Commands */}
                      {stream.ffmpegCommand && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-mute font-mono uppercase tracking-wider font-bold">FFmpeg Command</span>
                          <code className="text-[10px] text-body bg-canvas-soft-2 border border-hairline p-2.5 rounded-lg break-all font-mono leading-relaxed max-h-[80px] overflow-y-auto">
                            {stream.ffmpegCommand}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Live System Diagnostics Console Log */}
        <div className="lg:col-span-1 p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-mute" />
            Encoder Console Logs
          </span>

          <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto bg-primary text-on-primary rounded-xl p-3.5 font-mono text-[10px] leading-relaxed flex flex-col gap-2">
            {liveStreams.length === 0 ? (
              <span className="text-mute italic">No logs available (system idle).</span>
            ) : (
              liveStreams.map((stream) => (
                <div key={stream.id} className="flex flex-col gap-1">
                  <span className="text-link-bg-soft font-bold border-b border-white/10 pb-0.5 mb-1.5">
                    [{stream.title}]
                  </span>
                  {stream.ffmpegLogs.slice(0, 6).map((log) => (
                    <span
                      key={log.id}
                      className={
                        log.eventType === "ERROR"
                          ? "text-error-soft"
                          : log.eventType === "STATS"
                          ? "text-white/60"
                          : "text-white"
                      }
                    >
                      {new Date(log.loggedAt).toLocaleTimeString()}: {log.message}
                    </span>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
