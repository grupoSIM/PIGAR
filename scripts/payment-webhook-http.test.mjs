import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEntry = path.join(root, "apps", "api", "dist", "index.js");
const port = 3111;
const endpoint = `http://127.0.0.1:${port}/api/v1/webhooks/mercado-pago`;

async function waitForApi(processHandle, diagnostics) {
  let lastError;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (processHandle.exitCode !== null)
      throw new Error(`API exited before Webhook test with code ${processHandle.exitCode}.`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health/live`)).status === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${lastError?.message ?? "API did not become ready."}\n${diagnostics()}`);
}

function signedHeader(secret, requestId, dataId, ts) {
  const hash = createHmac("sha256", secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest("hex");
  return `ts=${ts},v1=${hash}`;
}

test("[payment-webhook-http][nest] preserva data.id/header y separa 400 de 401 sin guard global", async (t) => {
  const secret = "synthetic-nest-webhook-secret";
  const apiProcess = spawn(process.execPath, [apiEntry], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      PORT: String(port),
      MERCADO_PAGO_ACCESS_TOKEN: "synthetic-access-token",
      MERCADO_PAGO_WEBHOOK_SECRET: secret,
      PIGAR_PAYMENT_RETURN_BASE_URL: "https://staging.example.test",
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

  const dataId = "synthetic-payment";
  const requestId = "synthetic-request";
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = signedHeader(secret, requestId, dataId, ts);
  const body = { id: "synthetic-event", type: "payment", data: { id: dataId } };

  const invalidSchema = await fetch(`${endpoint}?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-signature": signature,
    },
    body: JSON.stringify({ ...body, data: {} }),
    redirect: "manual",
  });
  assert.equal(invalidSchema.status, 400);
  assert.match(invalidSchema.headers.get("content-type") ?? "", /application\/problem\+json/);

  const invalidSignature = await fetch(`${endpoint}?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-signature": `ts=${ts},v1=${"0".repeat(64)}`,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  assert.equal(invalidSignature.status, 401);

  const validPublicRequest = await fetch(`${endpoint}?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-signature": signature,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  assert.equal(validPublicRequest.status, 500);
  assert.equal(validPublicRequest.redirected, false);
  assert.equal(output.includes(secret), false);
  assert.equal(output.includes(dataId), false);
  assert.equal(output.includes(requestId), false);
});
