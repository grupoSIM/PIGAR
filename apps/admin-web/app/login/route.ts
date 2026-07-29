import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../lib/auth0";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const invitation = request.nextUrl.searchParams.get("invitation");
  const organization = request.nextUrl.searchParams.get("organization");

  if (!isAuth0Parameter(invitation) || !isAuth0Parameter(organization)) {
    return NextResponse.json(
      { code: "INVALID_INVITATION", title: "Invitación inválida" },
      { status: 400 },
    );
  }

  return auth0.startInteractiveLogin({
    authorizationParameters: { invitation, organization },
  });
}

function isAuth0Parameter(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{1,500}$/.test(value);
}
