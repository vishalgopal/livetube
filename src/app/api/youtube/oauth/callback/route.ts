import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getTokensFromCode } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const channelSlug = request.nextUrl.searchParams.get("state"); // Contains the channel slug

  if (!code || !channelSlug) {
    return NextResponse.json({ error: "Missing authorization code or state" }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Create a temporary client to fetch channel details
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_OAUTH_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const response = await youtube.channels.list({
      part: ["snippet", "id"],
      mine: true,
    });

    const youtubeChannel = response.data.items?.[0];
    if (!youtubeChannel || !youtubeChannel.id) {
      throw new Error("No YouTube channel details found for this Google account.");
    }

    const youtubeChannelId = youtubeChannel.id;
    const name = youtubeChannel.snippet?.title || "Connected Channel";

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Update channel record in database
    await db.channel.update({
      where: { slug: channelSlug },
      data: {
        youtubeChannelId,
        name,
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token || undefined, // Google only returns refresh_token on initial consent
        oauthTokenExpiresAt: expiresAt,
        status: "CONNECTED",
        lastSyncedAt: new Date(),
      },
    });

    // Redirect to home page
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (error: any) {
    console.error("YouTube OAuth callback error:", error);
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message || "OAuth failed")}`, baseUrl));
  }
}
