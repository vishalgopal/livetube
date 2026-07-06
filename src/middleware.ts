import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicSignupEnabled = process.env.ALLOW_PUBLIC_SIGNUP === "true";

  // Paths that do not require authentication
  if (
    path.startsWith("/login") ||
    (path.startsWith("/signup") && publicSignupEnabled) ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (path.startsWith("/signup") && !publicSignupEnabled) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const sessionUrl = new URL("/api/auth/get-session", request.url);
    const response = await fetch(sessionUrl, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const sessionData = await response.json().catch(() => null);

    if (!sessionData || !sessionData.session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all dashboard pages and custom APIs
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/media/upload|api/media/file).*)",
  ],
};
