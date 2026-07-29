import { NextResponse } from "next/server";
import { auth0 } from "../../lib/auth0";

export async function GET(): Promise<NextResponse> {
  return auth0.startInteractiveLogin();
}
