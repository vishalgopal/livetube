import { db } from "@/lib/db";
import { getActiveChannelContext } from "@/lib/channel-access";
import { Calendar, Plus, Play, Trash2, RotateCw, CheckCircle2, AlertCircle, Clock, Copy } from "lucide-react";
import { scheduleStreamAction, cancelStreamAction, duplicateStreamAction } from "@/app/actions/scheduler";
import { startStreamAction } from "@/app/actions/streams";

export default async function SchedulerPage() {
  const { activeChannel } = await getActiveChannelContext();

  if (!activeChannel) {
    return <div className="text-mute">No channel selected.</div>;
  }

  const channelId = activeChannel.id;

  // Fetch playlists
  const playlists = await db.playlist.findMany({
    where: { channelId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  // Fetch all streams
  const streams = await db.stream.findMany({
    where: { channelId },
    include: { playlist: true },
    orderBy: { scheduledStartAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Scheduler</h1>
        <p className="text-sm text-mute">
          Schedule loop streams and configure auto-recovery parameters for {activeChannel.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 items-start">
        {/* Left Column Scheduler form */}
        <div className="lg:col-span-1 p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
            Schedule Stream
          </span>

          <form
            action={async (formData) => {
              "use server";
              const title = formData.get("title") as string;
              const playlistId = formData.get("playlistId") as string;
              const dateStr = formData.get("startDate") as string;
              const recovery = formData.get("recovery") === "on";

              if (title && playlistId && dateStr) {
                await scheduleStreamAction({
                  channelId: activeChannel!.id,
                  title,
                  playlistId,
                  scheduledStartAt: new Date(dateStr),
                  autoRecoveryEnabled: recovery,
                });
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body">Stream Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Monday Morning Mantra Live"
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body">Select Playlist</label>
              <select
                name="playlistId"
                required
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
              >
                <option value="" disabled>
                  -- Choose Playlist --
                </option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body">Scheduled Start Date & Time</label>
              <input
                name="startDate"
                type="datetime-local"
                required
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer font-mono"
              />
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                name="recovery"
                id="recovery"
                defaultChecked
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <label htmlFor="recovery" className="text-xs font-semibold text-body cursor-pointer">
                Enable Auto Recovery
              </label>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-ink text-on-primary text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Stream
            </button>
          </form>
        </div>

        {/* Right Column Scheduled Grid */}
        <div className="lg:col-span-3 p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
            Broadcast Calendar List
          </span>

          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {streams.length === 0 ? (
              <div className="p-8 text-center text-xs text-mute font-medium">
                No streams scheduled. Configure the schedule panel on the left to add one.
              </div>
            ) : (
              streams.map((stream) => {
                const isScheduled = stream.status === "SCHEDULED";
                const isLive = stream.status === "LIVE";
                const isStarting = stream.status === "STARTING";

                return (
                  <div
                    key={stream.id}
                    className="p-4 bg-canvas-soft-2 rounded-xl border border-hairline/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm truncate" title={stream.title}>
                          {stream.title}
                        </span>
                        
                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                            isLive
                              ? "bg-link-bg-soft text-link-deep border border-link animate-pulse"
                              : isStarting
                              ? "bg-warning-soft text-warning-deep border border-warning-soft"
                              : isScheduled
                              ? "bg-canvas-soft-2 text-mute border border-hairline-strong"
                              : stream.status === "FAILED"
                              ? "bg-error-soft/30 text-error-deep border border-error-soft"
                              : "bg-canvas-soft-2 text-mute"
                          }`}
                        >
                          {stream.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-mute font-medium mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Start:{" "}
                          {new Date(stream.scheduledStartAt).toLocaleString()}
                        </span>
                        <span>|</span>
                        <span>Playlist: {stream.playlist?.name || "None"}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(isScheduled || isStarting) && (
                        <form
                          action={async () => {
                            "use server";
                            await startStreamAction(stream.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" /> Go Live
                          </button>
                        </form>
                      )}

                      {isLive && (
                        <span className="text-xs text-link-deep font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-link animate-ping" /> Stream Active
                        </span>
                      )}

                      {(isScheduled || isStarting) && (
                        <form
                          action={async () => {
                            "use server";
                            await cancelStreamAction(stream.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer"
                            title="Cancel Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      )}

                      <form
                        action={async () => {
                          "use server";
                          // Duplicate stream 24h later
                          const nextDay = new Date(new Date(stream.scheduledStartAt).getTime() + 24 * 60 * 60 * 1000);
                          await duplicateStreamAction(stream.id, nextDay);
                        }}
                      >
                        <button
                          type="submit"
                          className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-mute hover:text-ink transition-colors cursor-pointer"
                          title="Duplicate Schedule (+24h)"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
