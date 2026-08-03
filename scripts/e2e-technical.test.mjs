import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(root, "infra", "compose", "docker-compose.yml");
const project = `pigar-e2e-${process.pid}`;
const port = "18088";
const baseUrl = `http://127.0.0.1:${port}`;

function compose(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "-p", project, "-f", composeFile, ...arguments_], {
      cwd: root,
      env: { ...process.env, PIGAR_HTTP_PORT: port },
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
    assert.equal((await waitFor(`${baseUrl}/`)).status, 200);
    assert.equal((await waitFor(`${baseUrl}/admin`)).status, 200);
    assert.equal((await waitFor(`${baseUrl}/api/health/ready`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/media/not-public`)).status, 404);
    const offers = await fetch(`${baseUrl}/api/v1/catalog/offers`);
    assert.equal(offers.status, 200);
    assert.deepEqual(await offers.json(), {
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
    });

    await compose(["restart", "postgres", "api"]);
    assert.equal((await waitFor(`${baseUrl}/api/health/ready`)).status, 200);

    assert.deepEqual(await declaredPublishedServices(), ["nginx"]);
  },
);
