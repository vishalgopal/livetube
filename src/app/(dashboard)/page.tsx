import Link from "next/link";
import { AlertCircle, CheckCircle2, FolderOpen, PlugZap, Radio } from "lucide-react";
import { db } from "@/lib/db";
import { getActiveChannelContext } from "@/lib/channel-access";

export default async function DashboardPage() {
  const { activeChannel } = await getActiveChannelContext();

  if (!activeChannel) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">MVP Dashboard</h1>
          <p className="text-sm text-mute">
            Start with one connected channel, then upload media and publish or stream from Studio.
          </p>
        </div>

        <div className="rounded-xl border border-warning-soft bg-warning-soft/20 p-5 text-sm text-warning-deep">
          No active channel is selected yet. Create or connect a channel first.
        </div>

        <Link
          href="/channels"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-ink"
        >
          <PlugZap className="h-4 w-4" />
          Open Channels
        </Link>
      </div>
    );
  }

  const uploads = await db.youTubeUpload.findMany({
    where: { channelId: activeChannel.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stream = await db.stream.findFirst({
    where: {
      channelId: activeChannel.id,
      status: { in: ["LIVE", "STARTING"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const steps = [
    {
      href: "/channels" as const,
      title: "1. Connect Channel",
      description: "Save channel defaults and complete YouTube OAuth.",
      icon: PlugZap,
    },
    {
      href: "/media" as const,
      title: "2. Upload Media",
      description: "Add the video, audio, image, or thumbnail assets you need.",
      icon: FolderOpen,
    },
    {
      href: "/studio" as const,
      title: "3. Publish or Go Live",
      description: "Choose a media asset, set metadata, then publish or start streaming.",
      icon: Radio,
    },
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">MVP Dashboard</h1>
        <p className="text-sm text-mute">
          Current channel: <span className="font-semibold text-ink">{activeChannel.name}</span>
        </p>
      </div>

      {activeChannel.status !== "CONNECTED" && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-soft bg-warning-soft/20 p-4 text-sm text-warning-deep">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            This channel is not connected to YouTube yet. Complete the connection step in{" "}
            <Link href="/channels" className="font-semibold underline">
              Channels
            </Link>
            .
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.href}
              href={step.href}
              className="rounded-xl border border-hairline bg-canvas p-5 transition-colors hover:bg-canvas-soft"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-canvas-soft-2 text-ink">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-ink">{step.title}</h2>
              <p className="mt-1 text-sm text-mute">{step.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-hairline bg-canvas p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink font-mono">
              Live Status
            </h2>
            {stream?.status === "LIVE" && (
              <span className="rounded-full border border-link bg-link-bg-soft px-2.5 py-0.5 text-[10px] font-bold uppercase text-link-deep">
                Live
              </span>
            )}
            {stream?.status === "STARTING" && (
              <span className="rounded-full border border-warning-soft bg-warning-soft/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-warning-deep">
                Starting
              </span>
            )}
          </div>

          {!stream ? (
            <p className="mt-4 text-sm text-mute">No active stream for this channel.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">{stream.title}</span>
              <span className="text-xs text-mute">
                Open Studio to stop the current stream or start a new one.
              </span>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-hairline bg-canvas p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink font-mono">
            Recent Uploads
          </h2>

          {uploads.length === 0 ? (
            <p className="mt-4 text-sm text-mute">No uploads yet for this channel.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="rounded-lg border border-hairline bg-canvas-soft/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{upload.title}</span>
                    <span className="text-[10px] font-mono text-mute">
                      {new Date(upload.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {upload.status === "PUBLISHED" ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Published
                      </span>
                    ) : (
                      <span className="text-mute">{upload.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
