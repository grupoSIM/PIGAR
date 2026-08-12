import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[auth-client] el portal cliente ofrece sólo OTP email", async () => {
  const [auth0, page, route, mediaRoute, proxy] = await Promise.all([
    readWorkspaceFile("apps/customer-web/lib/auth0.ts"),
    readWorkspaceFile("apps/customer-web/app/page.tsx"),
    readWorkspaceFile("apps/customer-web/app/auth/login/[connection]/route.ts"),
    readWorkspaceFile("apps/customer-web/app/api/requests/[id]/media/route.ts"),
    readWorkspaceFile("apps/customer-web/proxy.ts"),
  ]);

  assert.match(auth0, /Auth0Client/);
  assert.match(auth0, /PIGAR_CUSTOMER_AUTH0_CLIENT_ID/);
  assert.match(auth0, /PIGAR_CUSTOMER_AUTH0_SESSION_SECRET/);
  assert.match(page, /href="\/auth\/login\/email"/);
  assert.doesNotMatch(page, /Google|contraseña|registro|Apple|teléfono|SMS|WhatsApp/i);
  assert.doesNotMatch(route, /Google|PIGAR_CUSTOMER_AUTH0_GOOGLE_CONNECTION/i);
  assert.match(route, /PIGAR_CUSTOMER_AUTH0_EMAIL_OTP_CONNECTION/);
  assert.match(route, /startInteractiveLogin/);
  assert.match(mediaRoute, /export async function POST/);
  assert.match(mediaRoute, /\/v1\/requests\/\$\{encodeURIComponent\(id\)\}\/media/);
  assert.match(proxy, /auth0\.middleware/);
});

function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
