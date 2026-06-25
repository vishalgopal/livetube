import { NextRequest, NextResponse } from "next/server";
import { getYoutubeAuthUrl } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const channelSlug = request.nextUrl.searchParams.get("channelSlug");

  if (!channelSlug) {
    return NextResponse.json({ error: "Missing channelSlug query parameter" }, { status: 400 });
  }

  const authUrl = getYoutubeAuthUrl(channelSlug);
  return NextResponse.redirect(authUrl);
}
