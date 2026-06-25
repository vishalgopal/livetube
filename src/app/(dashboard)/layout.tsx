import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ChannelSwitcher from "@/components/channel-switcher";
import {
  LayoutDashboard,
  FolderOpen,
  ListMusic,
  BrainCircuit,
  UploadCloud,
  Calendar,
  MessageSquare,
  Activity,
  User,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch channels to pass to switcher
  const channels = await db.channel.findMany({
    orderBy: { name: "asc" },
  });

  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  // Resolve active channel context
  let activeChannel = channels.find((c) => c.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  const navLinks = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Media Library", href: "/media", icon: FolderOpen },
    { label: "Playlists", href: "/playlists", icon: ListMusic },
    { label: "AI Templates", href: "/ai-templates", icon: BrainCircuit },
    { label: "Publishing", href: "/publishing", icon: UploadCloud },
    { label: "Scheduler", href: "/scheduler", icon: Calendar },
    { label: "Moderation", href: "/moderation", icon: MessageSquare },
    { label: "System Health", href: "/health", icon: Activity },
  ];

  return (
    <div className="flex h-full min-h-screen bg-canvas-soft text-ink overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-canvas border-r border-hairline flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6 p-4 overflow-y-auto">
          {/* Logo and App Title */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="relative w-7 h-7 flex items-center justify-center bg-primary rounded-md text-on-primary font-bold text-base shadow-sm">
              L
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-link border border-canvas" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-ink to-body">
              LiveTube
            </span>
            <span className="text-[10px] text-mute font-mono bg-canvas-soft-2 px-1.5 py-0.5 rounded-sm">
              v2.0
            </span>
          </div>

          {/* Channel Selector */}
          <div className="px-1">
            <ChannelSwitcher
              channels={channels.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                status: c.status,
              }))}
              activeChannelSlug={activeChannel?.slug || ""}
            />
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1 px-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href as any}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-body hover:text-ink hover:bg-canvas-soft transition-all duration-150 group"
                >
                  <Icon className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-hairline bg-canvas-soft/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center shrink-0">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-mute" />
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-ink">
                {session.user.name}
              </span>
              <span className="text-[10px] text-mute truncate capitalize font-mono">
                {(session.user as any).role || "Operator"}
              </span>
            </div>
          </div>
          <button
            title="Sign Out"
            onClick={async () => {
              "use server";
              // We'll call the signout logic or redirect
              // To handle logout client-side, we normally use the Better Auth client.
              // We can render a client side button or handle it in a form.
            }}
            className="p-1.5 rounded-md hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer"
          >
            {/* Direct forms or client wrapper handles trigger. Let's make this simple by using a client-side wrapper in future or just simple form action */}
            <form action="/api/auth/sign-out" method="POST">
              <button type="submit" className="cursor-pointer">
                <LogOutButton />
              </button>
            </form>
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-canvas border-b border-hairline flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-body">Active Workspace:</span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-canvas-soft-2 border border-hairline text-xs font-medium text-ink">
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeChannel?.status === "CONNECTED" ? "bg-link animate-pulse" : "bg-mute"
              }`} />
              {activeChannel?.name || "None"}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-mute">
            <span>VPS: dev-vps-01</span>
            <span>|</span>
            <span>Uptime: 99.98%</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function LogOutButton() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
