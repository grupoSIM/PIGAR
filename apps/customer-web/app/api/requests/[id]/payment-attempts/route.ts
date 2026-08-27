import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth0.getSession();
    if (!session) return unauthorized();
    const { token } = await auth0.getAccessToken();
    const { id } = await context.params;
    const response = await fetch(
      `${apiUrl}/v1/requests/${encodeURIComponent(id)}/payment-attempts`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": request.headers.get("idempotency-key") ?? crypto.randomUUID(),
        },
        body: await request.text(),
      },
    );
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return unauthorized();
  }
}
function unauthorized() {
  return NextResponse.json({ title: "Authentication required", status: 401 }, { status: 401 });
}
