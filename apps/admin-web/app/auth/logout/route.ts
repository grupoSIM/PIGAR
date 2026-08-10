import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = new URL("/admin", request.url).toString();
  request.nextUrl.searchParams.set("returnTo", returnTo);
  const response = await auth0.middleware(request);
  const cookieNames = [
    "pigar_admin_session",
    "pigar_admin_session_0",
    "pigar_admin_session_1",
    "pigar_admin_session_2",
  ];

  for (const name of cookieNames) {
    for (const path of ["/admin", "/"]) {
      response.cookies.set(name, "", { expires: new Date(0), maxAge: 0, path });
    }
  }

  return response;
}
