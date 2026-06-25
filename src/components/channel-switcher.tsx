"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Tv, Check, RefreshCw } from "lucide-react";
import { setActiveChannelAction } from "@/app/actions/channel";

interface Channel {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ChannelSwitcherProps {
  channels: Channel[];
  activeChannelSlug: string;
}

export default function ChannelSwitcher({ channels, activeChannelSlug }: ChannelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const activeChannel = channels.find((c) => c.slug === activeChannelSlug) || channels[0];

  const handleSelect = async (slug: string) => {
    if (slug === activeChannelSlug) {
      setIsOpen(false);
      return;
    }
    setIsPending(true);
    setIsOpen(false);
    try {
      await setActiveChannelAction(slug);
      router.refresh();
    } catch (err) {
      console.error("Failed to select channel:", err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-hairline bg-canvas hover:bg-canvas-soft transition-all text-sm font-medium shadow-xs text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary shrink-0">
            {isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Tv className="w-4 h-4" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-ink font-semibold">{activeChannel?.name || "Select Channel"}</span>
            <span className="text-[10px] text-mute uppercase tracking-wider font-mono">
              {activeChannel?.status || "DISCONNECTED"}
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-mute shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1.5 p-1 bg-canvas border border-hairline rounded-lg shadow-md z-20 flex flex-col gap-0.5">
            <div className="px-2.5 py-1.5 text-[10px] text-mute font-mono uppercase tracking-wider">
              Switch Channel
            </div>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleSelect(channel.slug)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left text-sm font-medium transition-colors cursor-pointer ${
                  channel.slug === activeChannelSlug
                    ? "bg-canvas-soft-2 text-ink"
                    : "hover:bg-canvas-soft text-body"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate">{channel.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    channel.status === "CONNECTED" ? "bg-link" : "bg-mute"
                  }`} />
                </div>
                {channel.slug === activeChannelSlug && (
                  <Check className="w-4 h-4 text-ink shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
