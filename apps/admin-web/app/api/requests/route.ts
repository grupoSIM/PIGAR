import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";

const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";

export async function GET() {
  const audience = process.env.AUTH0_AUDIENCE;
  const session = await auth0.getSession().catch(() => null);
  if (!session) return authenticationProblem("AUTH_SESSION_MISSING");

  let token: string;
  try {
    ({ token } = await auth0.getAccessToken(audience ? { audience } : undefined));
  } catch {
    return authenticationProblem("AUTH_ACCESS_TOKEN_UNAVAILABLE");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/admin/requests`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return NextResponse.json(
      { status: 502, title: "Administrative API unavailable" },
      { status: 502, headers: { "content-type": "application/problem+json" } },
    );
  }

  if (response.status === 401) return authenticationProblem("AUTH_API_TOKEN_REJECTED");

  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

function authenticationProblem(
  code: "AUTH_SESSION_MISSING" | "AUTH_ACCESS_TOKEN_UNAVAILABLE" | "AUTH_API_TOKEN_REJECTED",
) {
  return NextResponse.json(
    { code, status: 401, title: "Authentication required" },
    { status: 401, headers: { "content-type": "application/problem+json" } },
  );
}
