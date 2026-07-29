import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";

/**
 * Auth0 returns to this route after the internal user completes credentials
 * and MFA. Keeping it explicit also makes the callback available when the
 * framework proxy is not selected for a deployment path.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return auth0.middleware(request);
}
