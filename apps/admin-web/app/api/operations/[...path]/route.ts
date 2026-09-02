import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";

const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const session = await auth0.getSession().catch(() => null);
  if (!session) return problem("AUTH_SESSION_MISSING");
  const audience = process.env.AUTH0_AUDIENCE;
  let token: string;
  try {
    ({ token } = await auth0.getAccessToken(audience ? { audience } : undefined));
  } catch {
    return problem("AUTH_ACCESS_TOKEN_UNAVAILABLE");
  }
  const path = (await context.params).path;
  // `basePath` normally removes `/admin` before routing, but accept the
  // legacy `/api/operations/...` shape too so it cannot leak into the API path.
  const backendPath = (path[0] === "operations" ? path.slice(1) : path)
    .map(encodeURIComponent)
    .join("/");
  try {
    const response = await fetch(`${apiUrl}/v1/admin/${backendPath}${request.nextUrl.search}`, {
      method: request.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(request.headers.get("content-type")
          ? { "content-type": request.headers.get("content-type")! }
          : {}),
        ...(request.headers.get("idempotency-key")
          ? { "idempotency-key": request.headers.get("idempotency-key")! }
          : {}),
      },
      ...(request.method === "GET" ? {} : { body: await request.text() }),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        ...(response.headers.get("retry-after")
          ? { "retry-after": response.headers.get("retry-after")! }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { title: "Administrative API unavailable", status: 502 },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;

function problem(code: string) {
  return NextResponse.json(
    { code, title: "Authentication required", status: 401 },
    { status: 401, headers: { "content-type": "application/problem+json" } },
  );
}
