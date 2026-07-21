import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Username+password gate for /dashboard with session cookie
export function proxy(request: NextRequest) {
  const username = process.env.DASHBOARD_USERNAME;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!username || !password) {
    return NextResponse.json(
      { error: "DASHBOARD_USERNAME/DASHBOARD_PASSWORD no están configuradas." },
      { status: 500 }
    );
  }

  // Check for Authorization header (from login form)
  const auth = request.headers.get("authorization");
  if (auth) {
    const [, encoded] = auth.split(" ");
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [providedUsername, providedPassword] = decoded.split(":");

    if (providedUsername === username && providedPassword === password) {
      // Set httpOnly cookie for session
      const response = NextResponse.next();
      response.cookies.set("auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }
    // Auth header present but invalid
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  // Check for session cookie
  if (request.cookies.get("auth")?.value === "true") {
    return NextResponse.next();
  }

  // No auth - redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: "/dashboard/:path*",
};
