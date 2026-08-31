import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [suite, ...providedArguments] = process.argv.slice(2);
const arguments_ = providedArguments[0] === "--" ? providedArguments.slice(1) : providedArguments;
const grepIndex = arguments_.indexOf("--grep");
const grep = grepIndex === -1 ? undefined : arguments_[grepIndex + 1];

if (!suite || (grepIndex !== -1 && !grep)) {
  throw new Error("Uso: node scripts/run-test-suite.mjs <suite> [--grep <patrón>]");
}

const suites = {
  unit: [
    "scripts/architecture.test.mjs",
    "scripts/shells.test.mjs",
    "scripts/config.test.mjs",
    "scripts/observability.test.mjs",
    "scripts/order-state-machine.test.mjs",
    "scripts/staging-auth-config.test.mjs",
    "scripts/catalog.test.mjs",
    "scripts/requests.test.mjs",
    "scripts/orders.test.mjs",
    "scripts/billing.test.mjs",
    "scripts/payment-webhook-http.test.mjs",
    "scripts/notifications.test.mjs",
  ],
  integration: [
    "scripts/api-health.test.mjs",
    "scripts/api-contract.test.mjs",
    "scripts/media-poc.test.mjs",
    "scripts/payment-poc.test.mjs",
    "scripts/observability.test.mjs",
    "scripts/identity-profile.test.mjs",
    "scripts/catalog.test.mjs",
    "scripts/requests.test.mjs",
    "scripts/orders.test.mjs",
    "scripts/billing.test.mjs",
    "scripts/notifications-postgres.test.mjs",
    "scripts/payment-webhook-http.test.mjs",
    "scripts/notifications.test.mjs",
  ],
  e2e: [
    "scripts/e2e-technical.test.mjs",
    "scripts/identity-client.test.mjs",
    "scripts/requests.test.mjs",
    "scripts/orders.test.mjs",
    "scripts/billing.test.mjs",
    "scripts/payment-webhook-http.test.mjs",
    "scripts/notifications.test.mjs",
  ],
  security: [
    "scripts/media-poc.test.mjs",
    "scripts/payment-poc.test.mjs",
    "scripts/observability.test.mjs",
    "scripts/permission-matrix.test.mjs",
    "scripts/identity-admin.test.mjs",
    "scripts/identity-token.test.mjs",
    "scripts/catalog.test.mjs",
    "scripts/e2e-technical.test.mjs",
    "scripts/requests.test.mjs",
    "scripts/orders.test.mjs",
    "scripts/billing.test.mjs",
    "scripts/notifications-postgres.test.mjs",
    "scripts/payment-webhook-http.test.mjs",
    "scripts/notifications.test.mjs",
  ],
};

const files = suites[suite];
if (!files) throw new Error(`Suite desconocida: ${suite}`);

if (grep) {
  const pattern = new RegExp(grep);
  const hasMatchingTest = files.some((file) => pattern.test(readFileSync(file, "utf8")));
  if (!hasMatchingTest) throw new Error(`No hay pruebas de ${suite} que coincidan con: ${grep}`);
}

const nodeArguments = ["--test"];
if (grep) nodeArguments.push(`--test-name-pattern=${grep}`);
nodeArguments.push(...files);

const result = spawnSync(process.execPath, nodeArguments, { stdio: "inherit" });
process.exitCode = result.status ?? 1;
