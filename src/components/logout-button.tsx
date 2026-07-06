"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      title="Sign Out"
      disabled={isPending}
      onClick={async () => {
        try {
          setIsPending(true);
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
      className="p-1.5 rounded-md hover:bg-canvas-soft text-mute hover:text-error transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
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
    </button>
  );
}
