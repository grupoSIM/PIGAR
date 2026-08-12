import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";

const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json(
      { title: "Authentication required", status: 401 },
      { status: 401, headers: { "content-type": "application/problem+json" } },
    );
  }

  const { token } = await auth0.getAccessToken();
  const { id } = await context.params;
  const response = await fetch(`${apiUrl}/v1/requests/${encodeURIComponent(id)}/media`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": request.headers.get("content-type") ?? "application/octet-stream",
    },
    body: request.body,
    duplex: "half",
  } as RequestInit);
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/problem+json" },
  });
}
