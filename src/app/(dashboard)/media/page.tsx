import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { FolderPlus, Folder, FileVideo, Music, Image as ImageIcon, Search, Trash2, Edit, Move, ExternalLink } from "lucide-react";
import { createFolderAction, deleteMediaAction, renameMediaAction } from "@/app/actions/media";
import MediaUploadArea from "@/components/media-upload-area";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
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

  const { folderId } = await searchParams;
  const currentFolderId = folderId && folderId !== "root" ? folderId : null;

  // Fetch current folder name
  const currentFolder = currentFolderId
    ? await db.folder.findUnique({ where: { id: currentFolderId } })
    : null;

  // Fetch all folders for directory tree
  const folders = await db.folder.findMany({
    where: { channelId: activeChannel.id },
    orderBy: { name: "asc" },
  });

  // Filter root-level or child folders depending on location
  const childFolders = folders.filter((f) => f.parentId === currentFolderId);

  // Fetch media items in this folder
  const mediaItems = await db.media.findMany({
    where: {
      channelId: activeChannel.id,
      folderId: currentFolderId,
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Media Library</h1>
          <p className="text-sm text-mute">
            Upload and organize media assets for {activeChannel.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 flex-1 items-start">
        {/* Left Folder Tree Pane */}
        <div className="lg:col-span-1 p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
              Folders
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              href="/media?folderId=root"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                !currentFolderId ? "bg-canvas-soft-2 text-ink" : "text-body hover:bg-canvas-soft"
              }`}
            >
              <Folder className="w-4 h-4 text-mute" />
              Root Directory
            </Link>

            {folders
              .filter((f) => !f.parentId)
              .map((folder) => {
                const isSelected = folder.id === currentFolderId;
                const children = folders.filter((child) => child.parentId === folder.id);

                return (
                  <div key={folder.id} className="flex flex-col gap-0.5 pl-2">
                    <Link
                      href={`/media?folderId=${folder.id}`}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isSelected ? "bg-canvas-soft-2 text-ink" : "text-body hover:bg-canvas-soft"
                      }`}
                    >
                      <Folder className="w-4 h-4 text-mute fill-current opacity-30" />
                      {folder.name}
                    </Link>

                    {/* Children nested */}
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/media?folderId=${child.id}`}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-semibold pl-6 transition-colors ${
                          child.id === currentFolderId
                            ? "bg-canvas-soft-2 text-ink"
                            : "text-body hover:bg-canvas-soft"
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-mute" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                );
              })}
          </div>

          {/* Create Folder Form */}
          <form
            action={async (formData) => {
              "use server";
              const folderName = formData.get("folderName") as string;
              if (folderName) {
                await createFolderAction(activeChannel.id, folderName, currentFolderId);
              }
            }}
            className="flex flex-col gap-2 pt-4 border-t border-hairline"
          >
            <input
              name="folderName"
              placeholder="New Folder Name"
              required
              className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-ink text-on-primary text-xs font-semibold cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Create Folder
            </button>
          </form>
        </div>

        {/* Right Main Assets Grid Pane */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Breadcrumbs / Path bar */}
          <div className="flex items-center gap-2 text-xs font-mono text-mute">
            <Link href="/media?folderId=root" className="hover:underline">
              root
            </Link>
            {currentFolder && (
              <>
                <span>/</span>
                <span className="text-ink font-semibold">{currentFolder.name}</span>
              </>
            )}
          </div>

          {/* Upload Component Area */}
          <MediaUploadArea channelId={activeChannel.id} folderId={currentFolderId || "root"} />

          {/* Assets Grid */}
          <div className="flex flex-col gap-4">
            {/* Show folders inside current view */}
            {childFolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {childFolders.map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/media?folderId=${folder.id}`}
                    className="p-3 border border-hairline rounded-xl bg-canvas hover:bg-canvas-soft transition-all flex items-center gap-3"
                  >
                    <Folder className="w-8 h-8 text-mute fill-current opacity-25 shrink-0" />
                    <span className="text-sm font-semibold text-ink truncate">{folder.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Media Items */}
            {mediaItems.length === 0 && childFolders.length === 0 ? (
              <div className="p-12 text-center border border-hairline rounded-xl bg-canvas text-mute text-sm font-medium">
                This folder is empty. Drag and drop or select files above to upload.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mediaItems.map((media) => {
                  const Icon =
                    media.type === "VIDEO"
                      ? FileVideo
                      : media.type === "AUDIO"
                      ? Music
                      : ImageIcon;
                  
                  const isImage = media.type === "IMAGE";

                  return (
                    <div
                      key={media.id}
                      className="border border-hairline rounded-xl bg-canvas overflow-hidden flex flex-col group relative"
                    >
                      <div className="aspect-video bg-canvas-soft-2 relative flex items-center justify-center border-b border-hairline">
                        <Icon className="w-8 h-8 text-mute" />
                        
                        {media.durationSeconds && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[10px] text-white font-mono">
                            {Math.floor(media.durationSeconds / 60)}:
                            {String(media.durationSeconds % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>

                      <div className="p-3 flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-bold text-ink truncate" title={media.title}>
                          {media.title}
                        </span>
                        <div className="flex items-center justify-between text-[10px] font-mono text-mute">
                          <span>{parseFloat((Number(media.sizeBytes) / 1024 / 1024).toFixed(1))} MB</span>
                          <span className="uppercase">{media.extension}</span>
                        </div>
                      </div>

                      {/* Hover Actions Panel overlay */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-canvas/90 backdrop-blur-xs p-1 rounded-md border border-hairline shadow-xs">
                        <form
                          action={async () => {
                            "use server";
                            await deleteMediaAction(media.id);
                          }}
                        >
                          <button
                            type="submit"
                            title="Delete"
                            className="p-1 rounded-sm hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}
