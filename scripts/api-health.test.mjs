import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEntry = path.join(root, "apps", "api", "dist", "index.js");
const port = 3101;
const baseUrl = `http://127.0.0.1:${port}/api`;

async function waitForApi(processHandle, diagnostics) {
  let lastError;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`API exited before healthcheck with code ${processHandle.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseUrl}/health/live`);
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`${lastError?.message ?? "API did not become ready in time."}\n${diagnostics()}`);
}

test("[health-degraded] la API permanece viva pero se degrada sin PostgreSQL", async (t) => {
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

  const live = await fetch(`${baseUrl}/health/live`);
  assert.equal(live.status, 200);
  assert.match(live.headers.get("content-type") ?? "", /^application\/json/);
  const liveBody = await live.json();
  assert.deepEqual(Object.keys(liveBody).sort(), ["service", "status", "timestamp"]);
  assert.equal(liveBody.service, "api");
  assert.equal(liveBody.status, "ok");
  assert.ok(Number.isFinite(Date.parse(liveBody.timestamp)));

  const correlation = "correlation-test-0001";
  const correlatedLive = await fetch(`${baseUrl}/health/live`, {
    headers: { "x-request-id": correlation },
  });
  assert.equal(correlatedLive.headers.get("x-request-id"), correlation);

  const ready = await fetch(`${baseUrl}/health/ready`);
  assert.equal(ready.status, 503);
  const readyBody = await ready.json();
  assert.equal(readyBody.code, "SERVICE_NOT_READY");
  assert.equal(readyBody.status, 503);

  const healthLogs = output
    .trim()
    .split("\n")
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    })
    .filter((entry) => entry.event === "health.live");
  assert.ok(healthLogs.some((entry) => entry.correlation_id === correlation));
  assert.equal(output.includes("DATABASE_URL"), false);
});
