import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  secret:
    process.env.PIGAR_ADMIN_AUTH0_SESSION_SECRET ??
    process.env.AUTH0_SECRET ??
    "local_dev_secret_at_least_32_characters_long_for_auth0",
  ...optionalAudience(process.env.AUTH0_AUDIENCE),
  session: { cookie: { name: "pigar_admin_session" } },
  signInReturnToPath: "/",
  transactionCookie: { prefix: "pigar_admin_txn_" },
});

function optionalAudience(audience: string | undefined) {
  return audience ? { authorizationParameters: { audience } } : {};
}
