import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple shared-password gate for /dashboard - this app has no user
// accounts at all (single WhatsApp number in, one dashboard out), so a full
// auth system would be overkill. Browsers show their native login prompt
// for HTTP Basic Auth, no login page needed.
export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "DASHBOARD_PASSWORD no está configurada." },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  const [, encoded] = auth?.split(" ") ?? [];
  const decoded = encoded ? Buffer.from(encoded, "base64").toString("utf-8") : "";
  const [, providedPassword] = decoded.split(":");

  if (providedPassword === password) {
    return NextResponse.next();
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dashboard"' },
  });
}

export const config = {
  matcher: "/dashboard/:path*",
};
