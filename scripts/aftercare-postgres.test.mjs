import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const { Client } = apiRequire("pg");
const composeFile = path.join(root, "infra", "compose", "docker-compose.yml");
const project = `pigar-aftercare-${process.pid}`;

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

function runNode(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, {
      cwd: root,
      env: { ...process.env, NODE_ENV: "test", HOST: "127.0.0.1", PORT: "3010" },
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
  "[feat-010-postgres] Docker/PostgreSQL ejecuta carreras de servicio y HTTP real",
  { timeout: 300_000, skip: Boolean(process.env.DATABASE_URL) },
  async (t) => {
    t.after(async () => compose(["down", "--volumes", "--remove-orphans"]));
    await compose(["up", "--build", "--detach", "--wait", "postgres", "migrate"]);
    const output = await compose([
      "run",
      "--rm",
      "--no-deps",
      "-e",
      "NODE_ENV=test",
      "-e",
      "HOST=127.0.0.1",
      "-e",
      "PORT=3010",
      "api",
      "node",
      "--test",
      "apps/api/src/aftercare/aftercare-postgres.test.mjs",
    ]);
    assert.match(output, /\[feat-010\]\[postgres\]/);
    assert.match(output, /\[feat-010\]\[http\]/);
    assert.doesNotMatch(output, /not ok|fail [1-9]/i);
  },
);

test(
  "[feat-010-postgres] reutiliza PostgreSQL provisto para carreras de servicio y HTTP real",
  { timeout: 120_000, skip: !process.env.DATABASE_URL },
  async () => {
    const output = await runNode(["--test", "apps/api/src/aftercare/aftercare-postgres.test.mjs"]);
    assert.match(output, /\[feat-010\]\[postgres\]/);
    assert.match(output, /\[feat-010\]\[http\]/);
    assert.doesNotMatch(output, /not ok|fail [1-9]/i);
  },
);
test("[feat-010-postgres] migración forward-only contiene constraints, FKs RESTRICT e historial append-only", async () => {
  const migration = await readFile(
    path.join(root, "apps/api/prisma/migrations/20260901090000_feat_010_aftercare/migration.sql"),
    "utf8",
  );
  for (const expected of [
    'CREATE TABLE "order_rating"',
    "aftercare_incident_one_active_order",
    "ON DELETE RESTRICT",
    "order_rating_append_only",
    "aftercare_incident_transition_append_only",
    "aftercare_idempotency_actor_scope_key",
  ])
    assert.match(migration, new RegExp(expected));
  assert.match(migration, /UNIQUE \("workOrderId"\)/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|CASCADE/i);
});

test(
  "[feat-010-postgres] PostgreSQL real aplica unicidad parcial, append-only y FKs restrictivas",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query("BEGIN");
    try {
      const profile = randomUUID();
      const request = randomUUID();
      const order = randomUUID();
      const incident = randomUUID();
      await client.query(
        'INSERT INTO "profile" ("id", "identitySubject", "role", "updatedAt") VALUES ($1, $2, \'CLIENT\', CURRENT_TIMESTAMP)',
        [profile, `synthetic-aftercare-${profile}`],
      );
      await client.query(
        'INSERT INTO "service_request" ("id", "clientProfileId", "idempotencyKey", "description", "categoryId", "categoryName", "categoryScope", "zoneId", "zoneName", "currency", "amount", "rateVersion", "rateValidFrom", "updatedAt") VALUES ($1,$2,$3,\'synthetic\',$4,\'synthetic\',\'synthetic\',$5,\'synthetic\',\'ARS\',1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
        [request, profile, `synthetic-${request}`, randomUUID(), randomUUID()],
      );
      await client.query(
        'INSERT INTO "work_order" ("id", "requestId", "state", "version", "updatedAt") VALUES ($1,$2,\'CERRADA\',1,CURRENT_TIMESTAMP)',
        [order, request],
      );
      await client.query(
        'INSERT INTO "order_rating" ("workOrderId", "clientProfileId", "stars", "reason") VALUES ($1,$2,5,\'PUNTUALIDAD\')',
        [order, profile],
      );
      await expectConstraint(client, "23505", () =>
        client.query(
          'INSERT INTO "order_rating" ("workOrderId", "clientProfileId", "stars", "reason") VALUES ($1,$2,4,\'CALIDAD_DEL_TRABAJO\')',
          [order, profile],
        ),
      );
      await expectConstraint(client, "P0001", () =>
        client.query('UPDATE "order_rating" SET "stars" = 1 WHERE "workOrderId" = $1', [order]),
      );
      await client.query(
        'INSERT INTO "aftercare_incident" ("id", "workOrderId", "clientProfileId", "type", "status", "version") VALUES ($1,$2,$3,\'TRABAJO_INCOMPLETO\',\'ABIERTA\',1)',
        [incident, order, profile],
      );
      await expectConstraint(client, "23505", () =>
        client.query(
          'INSERT INTO "aftercare_incident" ("workOrderId", "clientProfileId", "type", "status", "version") VALUES ($1,$2,\'DANIO_REPORTADO\',\'ABIERTA\',1)',
          [order, profile],
        ),
      );
      await client.query(
        'INSERT INTO "aftercare_incident_transition" ("incidentId", "sequence", "action", "toStatus", "actorProfileId") VALUES ($1,1,\'OPEN\',\'ABIERTA\',$2)',
        [incident, profile],
      );
      await expectConstraint(client, "P0001", () =>
        client.query('DELETE FROM "aftercare_incident_transition" WHERE "incidentId" = $1', [
          incident,
        ]),
      );
      await expectConstraint(client, "23503", () =>
        client.query('DELETE FROM "work_order" WHERE "id" = $1', [order]),
      );
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
);

async function expectConstraint(client, code, operation) {
  await client.query("SAVEPOINT aftercare_assertion");
  await assert.rejects(operation, { code });
  await client.query("ROLLBACK TO SAVEPOINT aftercare_assertion");
}
