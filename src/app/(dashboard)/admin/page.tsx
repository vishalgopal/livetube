import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  disconnectChannelAction,
  removeChannelMemberAction,
  upsertChannelMemberAction,
  updateUserRoleAction,
  upsertChannelAction,
} from "@/app/actions/admin";
import { getSessionUserRole, requireSession } from "@/lib/auth-guard";
import { ExternalLink, PlugZap, Save, Shield, Users, UserPlus, X } from "lucide-react";

export default async function AdminPage() {
  await requireSession();
  const role = await getSessionUserRole();
  if (role !== "admin") {
    redirect("/");
  }

  const [channels, users] = await Promise.all([
    db.channel.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    db.authUser.findMany({
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Admin</h1>
        <p className="text-sm text-mute">
          Create channels, reconnect YouTube access, and manage global app roles.
        </p>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4 h-fit">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-mute" />
            <span className="text-sm font-bold text-ink">Create Channel</span>
          </div>

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
                defaultTags: String(formData.get("defaultTags") || "")
                  .split(",")
                  .map((tag) => tag.trim()),
              });
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Channel Name
              <input
                name="name"
                required
                placeholder="Bhakti Live"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Slug
              <input
                name="slug"
                placeholder="bhakti-live"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              YouTube Channel ID
              <input
                name="youtubeChannelId"
                required
                placeholder="UCxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong font-mono"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Default Privacy
              <select
                name="defaultPrivacy"
                defaultValue="private"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
              >
                <option value="private">private</option>
                <option value="unlisted">unlisted</option>
                <option value="public">public</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Default Category ID
              <input
                name="defaultCategoryId"
                placeholder="22"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Default Stream Key
              <input
                name="defaultStreamKey"
                placeholder="abcd-1234-efgh-5678"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong font-mono"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-body">
              Default Tags
              <input
                name="defaultTags"
                placeholder="bhajan, meditation, live"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
              />
            </label>

            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-sm font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Create Channel
            </button>
          </form>
        </div>

        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-mute" />
            <span className="text-sm font-bold text-ink">Channels</span>
          </div>

          {channels.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-hairline text-sm text-mute text-center">
              No channels found. Use the create form to add the first one.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {channels.map((channel) => (
                <div key={channel.id} className="p-4 rounded-xl border border-hairline bg-canvas-soft/40 flex flex-col gap-4">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold transition-colors"
                      >
                        Connect <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <form action={async () => {
                        "use server";
                        await disconnectChannelAction(channel.id);
                      }}>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg border border-hairline hover:bg-canvas-soft text-xs font-semibold text-body cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </form>
                    </div>
                  </div>

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
                        defaultTags: String(formData.get("defaultTags") || "")
                          .split(",")
                          .map((tag) => tag.trim()),
                      });
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Name
                      <input
                        name="name"
                        defaultValue={channel.name}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Slug
                      <input
                        name="slug"
                        defaultValue={channel.slug}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong font-mono"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      YouTube Channel ID
                      <input
                        name="youtubeChannelId"
                        defaultValue={channel.youtubeChannelId}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong font-mono"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Default Privacy
                      <select
                        name="defaultPrivacy"
                        defaultValue={channel.defaultPrivacy || "private"}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                      >
                        <option value="private">private</option>
                        <option value="unlisted">unlisted</option>
                        <option value="public">public</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Default Category ID
                      <input
                        name="defaultCategoryId"
                        defaultValue={channel.defaultCategoryId || ""}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Default Stream Key
                      <input
                        name="defaultStreamKey"
                        defaultValue={channel.defaultStreamKey || ""}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong font-mono"
                      />
                    </label>

                    <label className="md:col-span-2 flex flex-col gap-1 text-[11px] font-semibold text-body">
                      Default Tags
                      <input
                        name="defaultTags"
                        defaultValue={channel.defaultTags.join(", ")}
                        className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                      />
                    </label>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline hover:bg-canvas-soft text-sm font-semibold text-body cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Save Changes
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-hairline pt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-mute" />
                      <span className="text-sm font-bold text-ink">Channel Members</span>
                    </div>

                    <form
                      action={async (formData) => {
                        "use server";
                        await upsertChannelMemberAction({
                          channelId: channel.id,
                          userId: String(formData.get("userId") || ""),
                          role: String(formData.get("role")) === "MANAGER" ? "MANAGER" : "OPERATOR",
                        });
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                    >
                      <label className="flex-1 flex flex-col gap-1 text-[11px] font-semibold text-body">
                        User
                        <select
                          name="userId"
                          required
                          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                        >
                          <option value="">Select user</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="w-full sm:w-40 flex flex-col gap-1 text-[11px] font-semibold text-body">
                        Channel Role
                        <select
                          name="role"
                          defaultValue="OPERATOR"
                          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                        >
                          <option value="OPERATOR">operator</option>
                          <option value="MANAGER">manager</option>
                        </select>
                      </label>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-ink text-on-primary text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" /> Save Member
                      </button>
                    </form>

                    {channel.members.length === 0 ? (
                      <div className="text-xs text-mute p-3 rounded-lg border border-dashed border-hairline">
                        No channel members assigned yet. Non-admin users will not see this channel until you add them here.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {channel.members.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 rounded-lg border border-hairline bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-sm font-semibold text-ink truncate">{member.user.name}</span>
                              <span className="text-[11px] text-mute font-mono truncate">{member.user.email}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-canvas-soft-2 border border-hairline text-body">
                                {member.role}
                              </span>
                              <form action={async () => {
                                "use server";
                                await removeChannelMemberAction(member.id);
                              }}>
                                <button
                                  type="submit"
                                  className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer"
                                  title="Remove member"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-mute" />
          <span className="text-sm font-bold text-ink">User Roles</span>
        </div>
        <p className="text-xs text-mute">
          Current permissions are global only. `admin` can manage channels and users. `operator` can use the dashboard.
        </p>

        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const userRole = (user.role || "operator").toLowerCase();

            return (
              <form
                key={user.id}
                action={async (formData) => {
                  "use server";
                  await updateUserRoleAction(
                    user.id,
                    String(formData.get("role")) === "admin" ? "admin" : "operator"
                  );
                }}
                className="p-4 rounded-xl border border-hairline bg-canvas-soft/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-ink truncate">{user.name}</span>
                  <span className="text-xs text-mute font-mono truncate">{user.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue={userRole === "admin" ? "admin" : "operator"}
                    className="px-3 py-2 rounded-lg border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:border-hairline-strong"
                  >
                    <option value="operator">operator</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline hover:bg-canvas-soft text-sm font-semibold text-body cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
