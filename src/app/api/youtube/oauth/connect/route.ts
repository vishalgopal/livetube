import { NextRequest, NextResponse } from "next/server";
import { requireChannelBySlug, requireSession } from "@/lib/auth-guard";
import { getYoutubeAuthUrl } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const channelSlug = request.nextUrl.searchParams.get("channelSlug");

  if (!channelSlug) {
    return NextResponse.json({ error: "Missing channelSlug query parameter" }, { status: 400 });
  }

  await requireSession();
  await requireChannelBySlug(channelSlug);

  const authUrl = getYoutubeAuthUrl(channelSlug);
  return NextResponse.redirect(authUrl);
}
