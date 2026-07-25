import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ConfigurationError,
  loadApiConfiguration,
  loadWorkerConfiguration,
} from "../packages/config/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[config-secrets] la configuración productiva falla temprano sin filtrar valores", () => {
  const secretLikeValue = "postgresql://hidden-user:hidden-password@private-host/pigar";
  assert.throws(
    () => loadApiConfiguration({ NODE_ENV: "production" }),
    (error) =>
      error instanceof ConfigurationError && error.message === "CONFIG_REQUIRED: DATABASE_URL",
  );
  assert.throws(
    () => loadWorkerConfiguration({ NODE_ENV: "development", WORKER_POLL_INTERVAL_MS: "zero" }),
    (error) =>
      error instanceof ConfigurationError &&
      error.message === "CONFIG_INVALID: WORKER_POLL_INTERVAL_MS",
  );
  assert.throws(
    () => loadApiConfiguration({ NODE_ENV: "development", PORT: secretLikeValue }),
    (error) =>
      error instanceof ConfigurationError &&
      error.message === "CONFIG_INVALID: PORT" &&
      !error.message.includes(secretLikeValue),
  );
  assert.equal(loadApiConfiguration({ NODE_ENV: "development", PORT: "3100" }).port, 3100);
});

test("[config-secrets] .env.example declara nombres y valores locales no secretos", async () => {
  const example = await readFile(path.join(root, ".env.example"), "utf8");
  assert.match(example, /^DATABASE_URL=$/m);
  assert.doesNotMatch(example, /access[_-]?token|client[_-]?secret|password\s*=/i);
});
