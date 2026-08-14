import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[staging-auth-configuration] cada superficie recibe sólo su configuración Auth0", async () => {
  const [
    adminConfig,
    adminAuth,
    customerAuth,
    compose,
    environment,
    nginx,
    localCompose,
    localAuthCompose,
  ] = await Promise.all([
    readWorkspaceFile("apps/admin-web/next.config.ts"),
    readWorkspaceFile("apps/admin-web/lib/auth0.ts"),
    readWorkspaceFile("apps/customer-web/lib/auth0.ts"),
    readWorkspaceFile("infra/hostinger/docker-compose.traefik.yml"),
    readWorkspaceFile("infra/hostinger/staging.env.example"),
    readWorkspaceFile("infra/nginx/nginx.conf"),
    readWorkspaceFile("infra/compose/docker-compose.yml"),
    readWorkspaceFile("infra/compose/docker-compose.auth0-local.yml"),
  ]);

  for (const variable of [
    "PIGAR_API_AUTH0_ISSUER",
    "PIGAR_API_AUTH0_AUDIENCE",
    "PIGAR_API_AUTH0_ADMIN_CLIENT_ID",
    "PIGAR_API_AUTH0_MANAGEMENT_CLIENT_SECRET",
    "PIGAR_API_AUTH0_INTERNAL_CONNECTION",
    "PIGAR_CUSTOMER_AUTH0_CLIENT_ID",
    "PIGAR_CUSTOMER_AUTH0_SESSION_SECRET",
    "PIGAR_CUSTOMER_AUTH0_EMAIL_OTP_CONNECTION",
    "PIGAR_ADMIN_AUTH0_CLIENT_ID",
    "PIGAR_ADMIN_AUTH0_SESSION_SECRET",
  ]) {
    assert.match(environment, new RegExp(`^${variable}=`, "m"));
  }
  assert.match(compose, /customer-web:[\s\S]*PIGAR_CUSTOMER_AUTH0_CLIENT_ID/);
  assert.doesNotMatch(compose, /PIGAR_CUSTOMER_AUTH0_GOOGLE_CONNECTION/);
  assert.match(compose, /admin-web:[\s\S]*AUTH0_CLIENT_ID: \$\{PIGAR_ADMIN_AUTH0_CLIENT_ID/);
  assert.match(
    compose,
    /api:[\s\S]*AUTH0_MANAGEMENT_CLIENT_SECRET: \$\{PIGAR_API_AUTH0_MANAGEMENT_CLIENT_SECRET/,
  );
  assert.match(adminConfig, /NEXT_PUBLIC_BASE_PATH: "\/admin"/);
  assert.doesNotMatch(nginx, /location = \/login/);
  assert.match(nginx, /proxy_buffer_size 16k;/);
  assert.match(nginx, /proxy_buffers 8 16k;/);
  assert.match(localCompose, /AUTH0_ISSUER: \$\{AUTH0_ISSUER:-https:\/\/auth0\.invalid\//);
  assert.doesNotMatch(localCompose, /customer-web:[\s\S]*env_file:/);
  assert.doesNotMatch(localCompose, /admin-web:[\s\S]*env_file:/);
  assert.match(localCompose, /customer-web:[\s\S]*PIGAR_CUSTOMER_AUTH0_CLIENT_SECRET/);
  assert.match(localCompose, /admin-web:[\s\S]*AUTH0_CLIENT_SECRET/);
  assert.match(adminAuth, /PIGAR_ADMIN_AUTH0_SESSION_SECRET \|\|/);
  assert.match(adminAuth, /AUTH0_SECRET \|\|/);
  assert.match(customerAuth, /PIGAR_CUSTOMER_AUTH0_SESSION_SECRET \|\|/);
  assert.match(customerAuth, /PIGAR_CUSTOMER_AUTH0_AUDIENCE \|\| process\.env\.AUTH0_AUDIENCE/);
  assert.match(localAuthCompose, /127\.0\.0\.1:3000:3000/);
  assert.match(localAuthCompose, /127\.0\.0\.1:3002:3000/);
  assert.doesNotMatch(
    localCompose.match(/customer-web:[\s\S]*?admin-web:/)?.[0] ?? "",
    /AUTH0_MANAGEMENT_CLIENT_SECRET|PIGAR_GOOGLE_GEOCODING_KEY/,
  );
  assert.doesNotMatch(
    localCompose.match(/admin-web:[\s\S]*?migrate:/)?.[0] ?? "",
    /AUTH0_MANAGEMENT_CLIENT_SECRET|PIGAR_GOOGLE_GEOCODING_KEY/,
  );
});

function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
