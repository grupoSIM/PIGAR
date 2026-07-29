import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[auth-client] el portal cliente inicia Universal Login con configuración aislada", async () => {
  const [auth0, page, proxy] = await Promise.all([
    readWorkspaceFile("apps/customer-web/lib/auth0.ts"),
    readWorkspaceFile("apps/customer-web/app/page.tsx"),
    readWorkspaceFile("apps/customer-web/proxy.ts"),
  ]);

  assert.match(auth0, /Auth0Client/);
  assert.match(auth0, /PIGAR_CUSTOMER_AUTH0_CLIENT_ID/);
  assert.match(auth0, /PIGAR_CUSTOMER_AUTH0_SESSION_SECRET/);
  assert.match(page, /href="\/auth\/login"/);
  assert.match(proxy, /auth0\.middleware/);
});

function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
