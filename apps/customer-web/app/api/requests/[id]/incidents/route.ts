import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";

const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";

async function forward(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth0.getSession();
    if (!session) return unauthorized();
    const { token } = await auth0.getAccessToken();
    const { id } = await context.params;
    const response = await fetch(
      `${apiUrl}/v1/requests/${encodeURIComponent(id)}/incidents${request.nextUrl.search}`,
      {
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
      },
    );
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
    return unauthorized();
  }
}
export const GET = forward;
export const POST = forward;
function unauthorized() {
  return NextResponse.json({ title: "Authentication required", status: 401 }, { status: 401 });
}
