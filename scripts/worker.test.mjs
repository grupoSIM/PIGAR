import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerEntry = path.join(root, "apps", "worker", "dist", "index.js");

test("el worker inicia y completa un ciclo ocioso con logs sanitizados", async (t) => {
  const workerProcess = spawn(process.execPath, [workerEntry], {
    cwd: root,
    env: {
      ...process.env,
      WORKER_POLL_INTERVAL_MS: "25",
    },
    stdio: ["ignore", "pipe", "ignore"],
  });

  let output = "";
  workerProcess.stdout.setEncoding("utf8");
  workerProcess.stdout.on("data", (chunk) => {
    output += chunk;
  });

  t.after(async () => {
    if (workerProcess.exitCode === null) {
      workerProcess.kill("SIGTERM");
      await once(workerProcess, "exit");
    }
  });

  for (let attempt = 0; attempt < 30 && !output.includes("worker.poll.idle"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  assert.match(output, /worker.started/);
  assert.match(output, /worker.poll.idle/);

  const events = output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), [
      "code",
      "correlation_id",
      "duration_ms",
      "environment",
      "event",
      "level",
      "service",
      "timestamp",
    ]);
    assert.equal(event.code, "OK");
    assert.equal(event.duration_ms, 0);
    assert.equal(event.level, "info");
    assert.equal(event.service, "worker");
    assert.ok(Number.isFinite(Date.parse(event.timestamp)));
  }
});
