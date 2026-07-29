import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[staging-auth-configuration] cada superficie recibe sólo su configuración Auth0", async () => {
  const [adminConfig, compose, environment, nginx] = await Promise.all([
    readWorkspaceFile("apps/admin-web/next.config.ts"),
    readWorkspaceFile("infra/hostinger/docker-compose.traefik.yml"),
    readWorkspaceFile("infra/hostinger/staging.env.example"),
    readWorkspaceFile("infra/nginx/nginx.conf"),
  ]);

  for (const variable of [
    "PIGAR_API_AUTH0_ISSUER",
    "PIGAR_API_AUTH0_AUDIENCE",
    "PIGAR_API_AUTH0_ADMIN_CLIENT_ID",
    "PIGAR_API_AUTH0_MANAGEMENT_CLIENT_SECRET",
    "PIGAR_CUSTOMER_AUTH0_CLIENT_ID",
    "PIGAR_CUSTOMER_AUTH0_SESSION_SECRET",
    "PIGAR_ADMIN_AUTH0_CLIENT_ID",
    "PIGAR_ADMIN_AUTH0_SESSION_SECRET",
  ]) {
    assert.match(environment, new RegExp(`^${variable}=`, "m"));
  }
  assert.match(compose, /customer-web:[\s\S]*PIGAR_CUSTOMER_AUTH0_CLIENT_ID/);
  assert.match(compose, /admin-web:[\s\S]*AUTH0_CLIENT_ID: \$\{PIGAR_ADMIN_AUTH0_CLIENT_ID/);
  assert.match(
    compose,
    /api:[\s\S]*AUTH0_MANAGEMENT_CLIENT_SECRET: \$\{PIGAR_API_AUTH0_MANAGEMENT_CLIENT_SECRET/,
  );
  assert.match(adminConfig, /NEXT_PUBLIC_BASE_PATH: "\/admin"/);
  assert.match(nginx, /location = \/login/);
  assert.match(
    await readWorkspaceFile("infra/compose/docker-compose.yml"),
    /AUTH0_ISSUER: https:\/\/auth0\.invalid\//,
  );
});

function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
