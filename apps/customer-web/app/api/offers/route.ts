import { NextResponse } from "next/server";

const apiUrl = process.env.PIGAR_API_BASE_URL ?? "http://127.0.0.1:3001/api";

export async function GET() {
  const response = await fetch(`${apiUrl}/v1/catalog/offers`, { cache: "no-store" });
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
