import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionUserRole } from "@/lib/auth-guard";
import { listAccessibleChannels } from "@/lib/channel-access";
import { disconnectChannelAction, upsertChannelAction } from "@/app/actions/admin";
import { ExternalLink, Save } from "lucide-react";

export default async function ChannelsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = await getSessionUserRole();
  const channels =
    role === "admin"
      ? await db.channel.findMany({
          orderBy: { name: "asc" },
        })
      : await listAccessibleChannels();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Channels</h1>
        <p className="text-sm text-mute">
          Connect your YouTube channels and set the defaults used by Media and Studio.
        </p>
      </div>

      {role === "admin" && (
        <section className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <span className="text-sm font-bold text-ink">Create Channel</span>
          <form
            action={async (formData) => {
              "use server";
              await upsertChannelAction({
                name: String(formData.get("name") || ""),
                slug: String(formData.get("slug") || ""),
                youtubeChannelId: String(formData.get("youtubeChannelId") || ""),
                defaultPrivacy: String(formData.get("defaultPrivacy") || ""),
                defaultCategoryId: String(formData.get("defaultCategoryId") || ""),
                defaultStreamKey: String(formData.get("defaultStreamKey") || ""),
                defaultTags: String(formData.get("defaultTags") || "").split(",").map((tag) => tag.trim()),
              });
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <input name="name" required placeholder="Channel name" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
            <input name="slug" placeholder="channel-slug" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
            <input name="youtubeChannelId" required placeholder="YouTube channel ID" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
            <select name="defaultPrivacy" defaultValue="private" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink">
              <option value="private">private</option>
              <option value="unlisted">unlisted</option>
              <option value="public">public</option>
            </select>
            <input name="defaultCategoryId" placeholder="Default category ID" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
            <input name="defaultStreamKey" placeholder="Default stream key" className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
            <input name="defaultTags" placeholder="Default tags, comma separated" className="md:col-span-2 w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-sm font-semibold">
                <Save className="w-4 h-4" /> Create Channel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        {channels.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-hairline text-sm text-mute text-center">
            No channels yet. Create one, then connect it to YouTube.
          </div>
        ) : (
          channels.map((channel) => (
            <div key={channel.id} className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{channel.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      channel.status === "CONNECTED"
                        ? "bg-link-bg-soft text-link-deep border border-link"
                        : channel.status === "TOKEN_EXPIRED"
                        ? "bg-warning-soft/40 text-warning-deep border border-warning-soft"
                        : "bg-canvas-soft-2 text-mute border border-hairline"
                    }`}>
                      {channel.status}
                    </span>
                  </div>
                  <span className="text-xs text-mute font-mono">Slug: {channel.slug}</span>
                  <span className="text-xs text-mute font-mono">YouTube: {channel.youtubeChannelId}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/api/youtube/oauth/connect?channelSlug=${channel.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold"
                  >
                    Connect <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {role === "admin" && (
                    <form action={async () => {
                      "use server";
                      await disconnectChannelAction(channel.id);
                    }}>
                      <button type="submit" className="px-3 py-1.5 rounded-lg border border-hairline hover:bg-canvas-soft text-xs font-semibold text-body">
                        Disconnect
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {role === "admin" && (
                <form
                  action={async (formData) => {
                    "use server";
                    await upsertChannelAction({
                      channelId: channel.id,
                      name: String(formData.get("name") || ""),
                      slug: String(formData.get("slug") || ""),
                      youtubeChannelId: String(formData.get("youtubeChannelId") || ""),
                      defaultPrivacy: String(formData.get("defaultPrivacy") || ""),
                      defaultCategoryId: String(formData.get("defaultCategoryId") || ""),
                      defaultStreamKey: String(formData.get("defaultStreamKey") || ""),
                      defaultTags: String(formData.get("defaultTags") || "").split(",").map((tag) => tag.trim()),
                    });
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  <input name="name" defaultValue={channel.name} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
                  <input name="slug" defaultValue={channel.slug} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
                  <input name="youtubeChannelId" defaultValue={channel.youtubeChannelId} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
                  <select name="defaultPrivacy" defaultValue={channel.defaultPrivacy || "private"} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink">
                    <option value="private">private</option>
                    <option value="unlisted">unlisted</option>
                    <option value="public">public</option>
                  </select>
                  <input name="defaultCategoryId" defaultValue={channel.defaultCategoryId || ""} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
                  <input name="defaultStreamKey" defaultValue={channel.defaultStreamKey || ""} className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink font-mono" />
                  <input name="defaultTags" defaultValue={channel.defaultTags.join(", ")} className="md:col-span-2 w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink" />
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline hover:bg-canvas-soft text-sm font-semibold text-body">
                      <Save className="w-4 h-4" /> Save Channel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
