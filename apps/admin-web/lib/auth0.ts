import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  ...optionalConfiguration("appBaseUrl", process.env.PIGAR_ADMIN_AUTH0_APP_BASE_URL),
  ...optionalConfiguration("clientId", process.env.PIGAR_ADMIN_AUTH0_CLIENT_ID),
  ...optionalConfiguration("clientSecret", process.env.PIGAR_ADMIN_AUTH0_CLIENT_SECRET),
  ...optionalConfiguration("domain", process.env.PIGAR_ADMIN_AUTH0_DOMAIN),
  secret:
    process.env.PIGAR_ADMIN_AUTH0_SESSION_SECRET ||
    process.env.AUTH0_SECRET ||
    "local_dev_secret_at_least_32_characters_long_for_auth0",
  ...optionalAudience(process.env.PIGAR_ADMIN_AUTH0_AUDIENCE ?? process.env.AUTH0_AUDIENCE),
  session: { cookie: { name: "pigar_admin_session" } },
  signInReturnToPath: "/",
  transactionCookie: { prefix: "pigar_admin_txn_" },
  routes: {
    callback: "/auth/callback",
    login: "/login",
  },
});

function optionalConfiguration(key: string, value: string | undefined): Record<string, string> {
  return value ? { [key]: value } : {};
}

function optionalAudience(audience: string | undefined) {
  return audience ? { authorizationParameters: { audience } } : {};
}
