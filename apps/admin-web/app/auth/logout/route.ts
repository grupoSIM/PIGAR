import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const domain = process.env.PIGAR_ADMIN_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || "";
  const clientId = process.env.PIGAR_ADMIN_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID || "";

  // Base URL is the hostname of the current request if not explicitly configured
  let returnTo = process.env.PIGAR_ADMIN_AUTH0_APP_BASE_URL || process.env.APP_BASE_URL;
  if (!returnTo) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3001";
    returnTo = `${proto}://${host}/admin`;
  } else {
    // If APP_BASE_URL is set but doesn't have the path, add it
    if (!returnTo.endsWith("/admin")) {
      returnTo = `${returnTo}/admin`;
    }
  }

  const logoutUrl = `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${encodeURIComponent(returnTo)}`;

  const response = NextResponse.redirect(logoutUrl);
  // Remove the session cookies
  response.cookies.delete("pigar_admin_session");
  response.cookies.delete("pigar_admin_session_0");
  response.cookies.delete("pigar_admin_session_1");
  response.cookies.delete("pigar_admin_session_2");

  return response;
}
