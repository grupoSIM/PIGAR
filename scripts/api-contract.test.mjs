import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "specs", "features", "feat-001", "api-contract.yaml");
const apiEntry = path.join(root, "apps", "api", "dist", "index.js");
const port = 3102;
const baseUrl = `http://127.0.0.1:${port}/api`;

async function waitForApi(processHandle, diagnostics) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`API exited before contract test with code ${processHandle.exitCode}.`);
    }
    try {
      if ((await fetch(`${baseUrl}/health/live`)).status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${lastError?.message ?? "API did not become ready in time."}\n${diagnostics()}`);
}

test("[api-contract] el contrato OpenAPI describe los únicos healthchecks públicos", async (t) => {
  const contract = await readFile(contractPath, "utf8");
  assert.match(contract, /^openapi: 3\.1\.0$/m);
  assert.match(contract, /^ {2}\/health\/live:$/m);
  assert.match(contract, /^ {2}\/health\/ready:$/m);
  assert.match(contract, /application\/problem\+json/);
  assert.match(contract, /X-Request-ID:/);
  assert.doesNotMatch(contract, /\/(orders|payments|media|technicians):/);

  const apiProcess = spawn(process.execPath, [apiEntry], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  apiProcess.stdout.on("data", (chunk) => (output += chunk));
  apiProcess.stderr.on("data", (chunk) => (output += chunk));
  t.after(async () => {
    if (apiProcess.exitCode === null) {
      apiProcess.kill("SIGTERM");
      await once(apiProcess, "exit");
    }
  });

  await waitForApi(apiProcess, () => output);

  const requestId = "api-contract-test-0001";
  const live = await fetch(`${baseUrl}/health/live`, { headers: { "x-request-id": requestId } });
  assert.equal(live.status, 200);
  assert.match(live.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal(live.headers.get("x-request-id"), requestId);
  assert.deepEqual(Object.keys(await live.json()).sort(), ["service", "status", "timestamp"]);

  const ready = await fetch(`${baseUrl}/health/ready`, { headers: { "x-request-id": requestId } });
  assert.equal(ready.status, 503);
  assert.match(ready.headers.get("content-type") ?? "", /^application\/problem\+json/);
  assert.equal(ready.headers.get("x-request-id"), requestId);
  assert.deepEqual(Object.keys(await ready.json()).sort(), ["code", "status", "title", "type"]);
});
