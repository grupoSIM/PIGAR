import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  ...optionalAudience(process.env.AUTH0_AUDIENCE),
  signInReturnToPath: "/",
});

function optionalAudience(audience: string | undefined) {
  return audience ? { authorizationParameters: { audience } } : {};
}
