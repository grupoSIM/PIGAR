import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";

const connections = {
  email: process.env.PIGAR_CUSTOMER_AUTH0_EMAIL_OTP_CONNECTION,
} as const;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ connection: string }> },
): Promise<NextResponse> {
  const { connection } = await context.params;
  const auth0Connection = connections[connection as keyof typeof connections];
  if (!auth0Connection)
    return NextResponse.json(
      { code: "AUTH_UNAVAILABLE", title: "Acceso no disponible" },
      { status: 503 },
    );
  return auth0.startInteractiveLogin({ authorizationParameters: { connection: auth0Connection } });
}
