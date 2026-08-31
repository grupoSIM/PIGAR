import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[notifications] las seis plantillas allowlist son estáticas, versionadas y sin datos prohibidos", async () => {
  const source = await readFile(
    path.join(root, "apps/api/src/notifications/notification-templates.ts"),
    "utf8",
  );
  for (const event of [
    "assignment_changed",
    "en_route",
    "cancelled",
    "payment.approved",
    "payment.rejected",
    "closed",
  ])
    assert.match(source, new RegExp(event));
  assert.match(source, /version !== 1/);
  assert.doesNotMatch(source, /domicilio|teléfono|importe|providerPaymentId|checkoutUrl/i);
});

test("[notifications] migración agrega FKs restrictivas, unicidad, índices y no borra historial", async () => {
  const migration = await readFile(
    path.join(
      root,
      "apps/api/prisma/migrations/20260831090000_feat_009_transactional_notifications/migration.sql",
    ),
    "utf8",
  );
  assert.match(migration, /transactional_notification_source_recipient_key/);
  assert.match(migration, /ON DELETE RESTRICT/g);
  assert.match(migration, /recipient_created_id_idx/);
  assert.match(migration, /WHERE "readAt" IS NULL/);
  assert.doesNotMatch(migration.replaceAll("ON DELETE RESTRICT", ""), /\b(DROP|DELETE)\b/i);
});

test("[notifications] la API filtra por dueño, usa cursor opaco y lectura monotónica", async () => {
  const [service, controller, contract] = await Promise.all([
    readFile(path.join(root, "apps/api/src/notifications/notifications.service.ts"), "utf8"),
    readFile(path.join(root, "apps/api/src/notifications/notifications.controller.ts"), "utf8"),
    readFile(path.join(root, "specs/features/feat-009/api-contract.yaml"), "utf8"),
  ]);
  assert.match(service, /recipientProfileId: actor.profileId/);
  assert.match(service, /COALESCE\("readAt", CURRENT_TIMESTAMP\)/);
  assert.match(service, /value\.length > 512/);
  assert.match(service, /NOTIFICATION_RATE_LIMITED/);
  assert.doesNotMatch(service, /materializeAvailable|setInterval/);
  assert.match(controller, /@UseGuards\(IdentityGuard\)/);
  assert.match(contract, /\/v1\/notifications/);
});

test("[notifications] sólo el worker reclama outbox y clasifica reintentos con backoff", async () => {
  const worker = await readFile(path.join(root, "apps/worker/src/index.ts"), "utf8");
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /NOTIFICATION_RECIPIENT_INVALID/);
  assert.match(worker, /NOTIFICATION_RETRY_EXHAUSTED/);
  assert.match(worker, /2 \*\* Math\.max/);
  assert.match(worker, /state = 'PROCESSING' AND "leaseExpiresAt" = \$2/);
  assert.match(worker, /state = 'PROCESSING' AND "leaseExpiresAt" = \$3/);
  assert.match(worker, /notification\.alert\.backlog_age/);
  assert.match(worker, /ON CONFLICT \("sourceEventId", "recipientProfileId"\) DO NOTHING/);
});

test("[notifications] la UI consume cursores y refleja el marcado antes de navegar", async () => {
  const ui = await readFile(path.join(root, "apps/customer-web/app/notifications.tsx"), "utf8");
  assert.match(ui, /nextCursor/);
  assert.match(ui, /Cargar más/);
  assert.match(ui, /items\.map\(\(notice\).*updated/);
  assert.match(ui, /\/api\/requests\/\$\{encodeURIComponent\(item\.target\.requestId\)\}\/order/);
});
