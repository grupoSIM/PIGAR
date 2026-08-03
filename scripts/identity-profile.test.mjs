import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(root, "infra", "compose", "docker-compose.yml");
const project = `pigar-identity-${process.pid}`;

function compose(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "-p", project, "-f", composeFile, ...arguments_], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
}

test(
  "[profile-idempotency] PostgreSQL conserva un único perfil bajo concurrencia",
  { timeout: 180_000 },
  async (t) => {
    t.after(async () => {
      await compose(["down", "--volumes", "--remove-orphans"]);
    });

    await compose(["up", "--build", "--detach", "--wait", "postgres", "migrate"]);
    const output = await compose([
      "run",
      "--rm",
      "--no-deps",
      "-e",
      "NODE_ENV=test",
      "api",
      "node",
      "--test",
      "apps/api/src/identity/profile-idempotency.test.mjs",
    ]);
    assert.match(output, /profile-idempotency/);
  },
);
