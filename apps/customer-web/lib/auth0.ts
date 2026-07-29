import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  ...optionalConfiguration("appBaseUrl", process.env.PIGAR_CUSTOMER_AUTH0_APP_BASE_URL),
  ...optionalConfiguration("clientId", process.env.PIGAR_CUSTOMER_AUTH0_CLIENT_ID),
  ...optionalConfiguration("clientSecret", process.env.PIGAR_CUSTOMER_AUTH0_CLIENT_SECRET),
  ...optionalConfiguration("domain", process.env.PIGAR_CUSTOMER_AUTH0_DOMAIN),
  ...optionalConfiguration("secret", process.env.PIGAR_CUSTOMER_AUTH0_SESSION_SECRET),
  ...optionalAudience(process.env.PIGAR_CUSTOMER_AUTH0_AUDIENCE),
  signInReturnToPath: "/",
});

function optionalConfiguration(key: string, value: string | undefined): Record<string, string> {
  return value ? { [key]: value } : {};
}

function optionalAudience(audience: string | undefined) {
  return audience ? { authorizationParameters: { audience } } : {};
}
