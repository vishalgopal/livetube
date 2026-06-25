import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  ListMusic,
  Plus,
  Play,
  RotateCw,
  Trash2,
  Copy,
  Archive,
  ArrowUp,
  ArrowDown,
  Clock,
  Video,
} from "lucide-react";
import {
  createPlaylistAction,
  addPlaylistItemAction,
  removePlaylistItemAction,
  reorderPlaylistItemsAction,
  duplicatePlaylistAction,
  archivePlaylistAction,
} from "@/app/actions/playlists";

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ playlistId?: string }>;
}) {
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  const channels = await db.channel.findMany({ orderBy: { name: "asc" } });
  let activeChannel = channels.find((c) => c.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  if (!activeChannel) {
    return <div className="text-mute">No channel context found.</div>;
  }

  const { playlistId } = await searchParams;

  // Fetch playlists
  const playlists = await db.playlist.findMany({
    where: { channelId: activeChannel.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const selectedPlaylist = playlists.find((p) => p.id === playlistId) || playlists[0];

  // Fetch items for selected playlist
  const playlistItems = selectedPlaylist
    ? await db.playlistItem.findMany({
        where: { playlistId: selectedPlaylist.id },
        include: { media: true },
        orderBy: { position: "asc" },
      })
    : [];

  // Fetch all media for "Add to playlist" selector
  const availableMedia = await db.media.findMany({
    where: {
      channelId: activeChannel.id,
      type: { in: ["VIDEO", "AUDIO"] },
    },
    orderBy: { title: "asc" },
  });

  // Calculate total playlist duration
  const totalDurationSec = playlistItems.reduce((acc, item) => acc + (item.media?.durationSeconds || 0), 0);
  const totalHours = Math.floor(totalDurationSec / 3600);
  const totalMins = Math.floor((totalDurationSec % 3600) / 60);

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Playlists</h1>
        <p className="text-sm text-mute">
          Manage loop and single-run streaming queues for {activeChannel.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 items-start">
        {/* Left Playlists Column */}
        <div className="lg:col-span-1 p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
              All Playlists
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <span className="text-xs text-mute font-medium py-2">No playlists created yet.</span>
            ) : (
              playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlists?playlistId=${pl.id}`}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm font-semibold transition-all ${
                    selectedPlaylist?.id === pl.id
                      ? "bg-canvas-soft-2 text-ink"
                      : "text-body hover:bg-canvas-soft"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListMusic className="w-4 h-4 text-mute shrink-0" />
                    <span className="truncate">{pl.name}</span>
                  </div>
                  <span className="text-[10px] text-mute font-mono">
                    {pl.type === "LOOP" ? "Loop" : "Run"}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* Create Playlist Form */}
          <form
            action={async (formData) => {
              "use server";
              const name = formData.get("name") as string;
              const type = formData.get("type") as "SINGLE_RUN" | "LOOP";
              const desc = formData.get("description") as string;
              if (name) {
                await createPlaylistAction(activeChannel!.id, name, type, desc);
              }
            }}
            className="flex flex-col gap-3 pt-4 border-t border-hairline"
          >
            <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
              Create Playlist
            </span>
            <div className="flex flex-col gap-1.5">
              <input
                name="name"
                placeholder="Playlist Title"
                required
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <select
                name="type"
                defaultValue="LOOP"
                className="w-full px-2 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              >
                <option value="LOOP">Loop Indefinitely</option>
                <option value="SINGLE_RUN">Single Playthrough</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-ink text-on-primary text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Playlist
            </button>
          </form>
        </div>

        {/* Right Active Playlist Designer */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {selectedPlaylist ? (
            <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-ink">{selectedPlaylist.name}</h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas-soft border border-hairline text-[10px] font-semibold font-mono uppercase text-mute">
                      {selectedPlaylist.type === "LOOP" ? (
                        <>
                          <RotateCw className="w-2.5 h-2.5" /> Loop
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-current" /> Single Run
                        </>
                      )}
                    </span>
                  </div>
                  {selectedPlaylist.description && (
                    <p className="text-xs text-mute">{selectedPlaylist.description}</p>
                  )}
                  <span className="text-xs font-mono text-mute flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" /> Total Time: {totalHours}h {totalMins}m (
                    {playlistItems.length} items)
                  </span>
                </div>

                {/* Duplication & Archiving */}
                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await duplicatePlaylistAction(selectedPlaylist.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Duplicate"
                      className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-mute hover:text-ink transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await archivePlaylistAction(selectedPlaylist.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Archive"
                      className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Add Media Selector */}
              <form
                action={async (formData) => {
                  "use server";
                  const mediaId = formData.get("mediaId") as string;
                  if (mediaId && mediaId !== "select") {
                    await addPlaylistItemAction(selectedPlaylist.id, mediaId);
                  }
                }}
                className="flex items-center gap-3 p-3 bg-canvas-soft/30 border border-hairline rounded-lg"
              >
                <select
                  name="mediaId"
                  defaultValue="select"
                  className="flex-1 px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
                >
                  <option value="select" disabled>
                    -- Select Video/Audio Asset --
                  </option>
                  {availableMedia.map((media) => (
                    <option key={media.id} value={media.id}>
                      {media.title} ({media.durationSeconds ? `${Math.floor(media.durationSeconds / 60)}m` : "no dur"})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Asset
                </button>
              </form>

              {/* Playlist Queue Items */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
                  Queue Flow
                </span>

                {playlistItems.length === 0 ? (
                  <div className="p-8 text-center border border-hairline rounded-xl bg-canvas text-mute text-xs font-medium">
                    No items in this playlist yet. Add an asset above to start.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {playlistItems.map((item, index) => {
                      const isFirst = index === 0;
                      const isLast = index === playlistItems.length - 1;

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-canvas-soft-2 border border-hairline/80 rounded-lg flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs text-mute font-bold w-4">
                              {index + 1}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-ink truncate">
                                {item.media?.title || "Unknown Asset"}
                              </span>
                              <span className="text-[10px] text-mute flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                {item.media?.durationSeconds
                                  ? `${Math.floor(item.media.durationSeconds / 60)}m ${
                                      item.media.durationSeconds % 60
                                    }s`
                                  : "0s"}
                              </span>
                            </div>
                          </div>

                          {/* Reordering and Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Up */}
                            <form
                              action={async () => {
                                "use server";
                                const copyList = playlistItems.map((i) => i.id);
                                // Swap index with index - 1
                                const temp = copyList[index];
                                copyList[index] = copyList[index - 1];
                                copyList[index - 1] = temp;
                                await reorderPlaylistItemsAction(selectedPlaylist.id, copyList);
                              }}
                            >
                              <button
                                type="submit"
                                disabled={isFirst}
                                className="p-1 rounded-md border border-hairline/60 bg-canvas hover:bg-canvas-soft text-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            </form>

                            {/* Down */}
                            <form
                              action={async () => {
                                "use server";
                                const copyList = playlistItems.map((i) => i.id);
                                // Swap index with index + 1
                                const temp = copyList[index];
                                copyList[index] = copyList[index + 1];
                                copyList[index + 1] = temp;
                                await reorderPlaylistItemsAction(selectedPlaylist.id, copyList);
                              }}
                            >
                              <button
                                type="submit"
                                disabled={isLast}
                                className="p-1 rounded-md border border-hairline/60 bg-canvas hover:bg-canvas-soft text-mute hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </form>

                            {/* Delete */}
                            <form
                              action={async () => {
                                "use server";
                                await removePlaylistItemAction(selectedPlaylist.id, item.id);
                              }}
                            >
                              <button
                                type="submit"
                                className="p-1 rounded-md border border-hairline/60 bg-canvas hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-hairline rounded-xl bg-canvas text-mute text-sm font-medium">
              Create a playlist in the left panel to begin designing your streams.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
