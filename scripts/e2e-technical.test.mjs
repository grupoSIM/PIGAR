import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(root, "infra", "compose", "docker-compose.yml");
const project = `pigar-e2e-${process.pid}`;
const port = "18088";
const baseUrl = `http://127.0.0.1:${port}`;
const webhookSecret = "local-e2e-synthetic-webhook-secret";

function compose(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "-p", project, "-f", composeFile, ...arguments_], {
      cwd: root,
      env: {
        ...process.env,
        PIGAR_HTTP_PORT: port,
        PIGAR_E2E_MERCADO_PAGO_WEBHOOK_SECRET: webhookSecret,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });
}

async function waitFor(url) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${url} respondió ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError ?? new Error(`No inició ${url}`);
}

async function declaredPublishedServices() {
  const config = JSON.parse(await compose(["config", "--format", "json"]));
  return Object.entries(config.services)
    .filter(([, service]) => Array.isArray(service.ports) && service.ports.length > 0)
    .map(([name]) => name)
    .sort();
}

test(
  "[network-surface][persistence-restart] Compose publica solo Nginx y atiende los flujos técnicos",
  { timeout: 180_000 },
  async (t) => {
    t.after(async () => {
      await compose(["down", "--volumes", "--remove-orphans"]);
    });

    await compose(["up", "--build", "--detach", "--wait"]);
    const operationalSchema = await compose([
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "pigar",
      "-d",
      "pigar",
      "-Atc",
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('technician', 'work_order', 'work_order_transition', 'assignment_idempotency') ORDER BY tablename",
    ]);
    assert.deepEqual(operationalSchema.trim().split("\n"), [
      "assignment_idempotency",
      "technician",
      "work_order",
      "work_order_transition",
    ]);
    const appendOnlyTrigger = await compose([
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "pigar",
      "-d",
      "pigar",
      "-Atc",
      "SELECT tgname FROM pg_trigger WHERE tgname = 'work_order_transition_append_only'",
    ]);
    assert.equal(appendOnlyTrigger.trim(), "work_order_transition_append_only");
    const fixtureSql = [
      "INSERT INTO profile (id, \"identitySubject\", role, \"updatedAt\") VALUES ('00000000-0000-4000-8000-000000000401', 'e2e-admin', 'ADMIN', NOW()), ('00000000-0000-4000-8000-000000000402', 'e2e-client', 'CLIENT', NOW())",
      "INSERT INTO service_request (id, \"clientProfileId\", \"idempotencyKey\", description, completeness, \"categoryId\", \"categoryName\", \"categoryScope\", \"zoneId\", \"zoneName\", currency, amount, \"rateVersion\", \"rateValidFrom\", \"updatedAt\") VALUES ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000402', 'e2e-order-request', 'synthetic', 'READY_FOR_OPERATION', '00000000-0000-4000-8000-000000000404', 'synthetic', 'synthetic', '00000000-0000-4000-8000-000000000405', 'synthetic', 'ARS', 1, 1, NOW(), NOW())",
      "INSERT INTO technician (id, \"fullName\", phone, status, \"updatedAt\") VALUES ('00000000-0000-4000-8000-000000000406', 'Synthetic technician', '+541155550000', 'ACTIVE', NOW())",
    ].join("; ");
    await compose([
      "exec",
      "-T",
      "postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "pigar",
      "-d",
      "pigar",
      "-c",
      fixtureSql,
    ]);
    const concurrentInsert = () =>
      compose([
        "exec",
        "-T",
        "postgres",
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "pigar",
        "-d",
        "pigar",
        "-c",
        "INSERT INTO work_order (id, \"requestId\", \"technicianId\", state, version, \"updatedAt\") VALUES (gen_random_uuid(), '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000406', 'TECNICO_ASIGNADO', 1, NOW())",
      ]);
    const concurrentResults = await Promise.allSettled([concurrentInsert(), concurrentInsert()]);
    assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(concurrentResults.filter((result) => result.status === "rejected").length, 1);
    assert.equal((await waitFor(`${baseUrl}/`)).status, 200);
    assert.equal((await waitFor(`${baseUrl}/admin`)).status, 200);
    assert.equal((await waitFor(`${baseUrl}/api/health/ready`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/media/not-public`)).status, 404);
    const offers = await fetch(`${baseUrl}/api/v1/catalog/offers`);
    assert.equal(offers.status, 200);
    const expectedOffers = {
      items: [
        {
          category: {
            description: "Diagnóstico y visita para resolver arreglos informados por el cliente.",
            id: "00000000-0000-4000-8000-000000000302",
            name: "Visita Simple",
            scope:
              "Incluye la visita, el diagnóstico y arreglos completables conforme a lo informado. Si excede el alcance, la visita se cobra y el resto requiere presupuesto posterior.",
          },
          currency: "ARS",
          price: "50000.00",
          version: 1,
        },
      ],
    };
    assert.deepEqual(await offers.json(), expectedOffers);

    const customerOffers = await fetch(`${baseUrl}/api/offers`);
    assert.equal(customerOffers.status, 200);
    assert.deepEqual(await customerOffers.json(), expectedOffers);

    const webhookDataId = `synthetic-payment-${process.pid}`;
    const webhookEventId = `synthetic-event-${process.pid}`;
    const webhookRequestId = `synthetic-request-${process.pid}`;
    const webhookTimestamp = String(Math.floor(Date.now() / 1000));
    const webhookHash = createHmac("sha256", webhookSecret)
      .update(`id:${webhookDataId};request-id:${webhookRequestId};ts:${webhookTimestamp};`)
      .digest("hex");
    const webhookUrl = `${baseUrl}/api/v1/webhooks/mercado-pago?data.id=${webhookDataId}&type=payment`;
    const webhookBody = {
      id: webhookEventId,
      type: "payment",
      data: { id: webhookDataId },
    };
    const webhookHeaders = {
      "content-type": "application/json",
      "x-request-id": webhookRequestId,
      "x-signature": `ts=${webhookTimestamp},v1=${webhookHash}`,
    };
    const webhook = await fetch(webhookUrl, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify(webhookBody),
      redirect: "manual",
    });
    assert.equal(webhook.status, 200);
    assert.deepEqual(await webhook.json(), { received: true });
    const duplicateWebhook = await fetch(webhookUrl, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify(webhookBody),
      redirect: "manual",
    });
    assert.equal(duplicateWebhook.status, 200);
    assert.deepEqual(await duplicateWebhook.json(), { received: true, duplicate: true });
    const invalidSchemaWebhook = await fetch(webhookUrl, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify({ ...webhookBody, data: {} }),
      redirect: "manual",
    });
    assert.equal(invalidSchemaWebhook.status, 400);
    const invalidSignatureWebhook = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        ...webhookHeaders,
        "x-signature": `ts=${webhookTimestamp},v1=${"0".repeat(64)}`,
      },
      body: JSON.stringify(webhookBody),
      redirect: "manual",
    });
    assert.equal(invalidSignatureWebhook.status, 401);
    const webhookReceiptHash = createHash("sha256").update(webhookEventId).digest("hex");
    const webhookPersistence = await compose([
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "pigar",
      "-d",
      "pigar",
      "-Atc",
      `SELECT (SELECT COUNT(*) FROM provider_event_receipt WHERE provider = 'mercado-pago' AND "externalEventIdHash" = '${webhookReceiptHash}'), (SELECT COUNT(*) FROM claimed_job WHERE "jobType" = 'mercado-pago-payment-reconciliation' AND "idempotencyKey" = '${webhookDataId}')`,
    ]);
    assert.equal(webhookPersistence.trim(), "1|1");

    const nginxConfig = await readFile(path.join(root, "infra", "nginx", "nginx.conf"), "utf8");
    assert.match(nginxConfig, /location \^~ \/api\/v1\/ \{[\s\S]*?proxy_pass http:\/\/api;/);
    assert.match(nginxConfig, /location \^~ \/api\/health\/ \{[\s\S]*?proxy_pass http:\/\/api;/);
    assert.match(nginxConfig, /location \^~ \/api\/ \{[\s\S]*?proxy_pass http:\/\/customer_web;/);

    for (const customerProxyUrl of [`${baseUrl}/api/address/resolve`, `${baseUrl}/api/requests`]) {
      const response = await fetch(customerProxyUrl, { method: "POST" });
      assert.equal(response.status, 401, `${customerProxyUrl} debe llegar al proxy cliente`);
      assert.match(response.headers.get("content-type") ?? "", /application\/problem\+json/);
    }

    await compose(["restart", "postgres", "api"]);
    assert.equal((await waitFor(`${baseUrl}/api/health/ready`)).status, 200);

    assert.deepEqual(await declaredPublishedServices(), ["nginx"]);
  },
);
