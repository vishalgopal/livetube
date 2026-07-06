"use server";

import { cookies } from "next/headers";
import { requireChannelBySlug } from "@/lib/auth-guard";

/**
 * Sets the active channel context cookie and triggers a reload.
 */
export async function setActiveChannelAction(slug: string) {
  await requireChannelBySlug(slug);

  const cookieStore = await cookies();
  cookieStore.set("selected_channel_slug", slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    sameSite: "lax",
  });
}
