import { loadWorkerConfiguration } from "@pigar/config";
import { createLogger } from "@pigar/observability";
import { Pool } from "pg";

const { pollIntervalMs: intervalMs } = loadWorkerConfiguration(process.env);
const logger = createLogger({
  environment: process.env.NODE_ENV ?? "development",
  service: "worker",
});
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

const templates: Record<string, { type: string; key: string }> = {
  "work_order.assignment_changed": {
    type: "WORK_ORDER_ASSIGNMENT_CHANGED",
    key: "assignment-changed",
  },
  "work_order.en_route": { type: "WORK_ORDER_EN_ROUTE", key: "technician-en-route" },
  "work_order.cancelled": { type: "WORK_ORDER_CANCELLED", key: "request-cancelled" },
  "payment.approved": { type: "PAYMENT_APPROVED", key: "payment-approved" },
  "payment.rejected": { type: "PAYMENT_REJECTED", key: "payment-rejected" },
  "work_order.closed": { type: "WORK_ORDER_CLOSED", key: "work-order-closed" },
};
type ClaimedEvent = {
  id: string;
  eventType: string;
  version: number;
  payload: { requestId?: unknown };
  attempts: number;
  leaseExpiresAt: Date;
};

function logWorkerEvent(event: string): void {
  logger.info(event, undefined, { code: "OK", duration_ms: 0 });
}

export async function pollOnce(): Promise<void> {
  if (!pool) return logWorkerEvent("worker.poll.idle");
  const client = await pool.connect();
  let event: ClaimedEvent | undefined;
  try {
    await client.query("BEGIN");
    const claim = await client.query(
      `WITH candidate AS (SELECT id FROM outbox_event WHERE "eventType" = ANY($1) AND (state = 'PENDING' OR (state = 'PROCESSING' AND "leaseExpiresAt" < NOW())) AND "availableAt" <= NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE outbox_event o SET state = 'PROCESSING', attempts = attempts + 1, "leaseExpiresAt" = NOW() + interval '30 seconds' FROM candidate WHERE o.id = candidate.id RETURNING o.id, o."eventType", o.version, o.payload, o.attempts, o."leaseExpiresAt"`,
      [Object.keys(templates)],
    );
    if (!claim.rowCount) {
      await client.query("COMMIT");
      return logWorkerEvent("worker.poll.idle");
    }
    const claimedEvent = claim.rows[0] as ClaimedEvent;
    event = claimedEvent;
    await client.query("COMMIT");
    const requestId = claimedEvent.payload?.requestId;
    const template = claimedEvent.version === 1 ? templates[claimedEvent.eventType] : undefined;
    if (!template || typeof requestId !== "string")
      return await fail(client, claimedEvent, "NOTIFICATION_EVENT_INVALID");
    const recipient = await client.query(
      `SELECT r."clientProfileId" FROM service_request r JOIN profile p ON p.id = r."clientProfileId" WHERE r.id = $1 AND p.role = 'CLIENT'`,
      [requestId],
    );
    if (!recipient.rowCount)
      return await fail(client, claimedEvent, "NOTIFICATION_RECIPIENT_INVALID");
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO transactional_notification ("recipientProfileId", "sourceEventId", "requestId", "eventType", "templateKey", "templateVersion") VALUES ($1, $2, $3, $4, $5, 1) ON CONFLICT ("sourceEventId", "recipientProfileId") DO NOTHING`,
      [recipient.rows[0].clientProfileId, claimedEvent.id, requestId, template.type, template.key],
    );
    const completed = await client.query(
      `UPDATE outbox_event SET state = 'PROCESSED', "processedAt" = NOW(), "leaseExpiresAt" = NULL WHERE id = $1 AND state = 'PROCESSING' AND "leaseExpiresAt" = $2`,
      [claimedEvent.id, claimedEvent.leaseExpiresAt],
    );
    await client.query("COMMIT");
    if (!completed.rowCount) return;
    logger.info("notification.materialized", undefined, {
      code: inserted.rowCount ? "NOTIFICATION_CREATED" : "NOTIFICATION_DUPLICATE",
      duration_ms: 0,
    });
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    if (event) await retry(client, event);
    else
      logger.warn("notification.retry", undefined, {
        code: "NOTIFICATION_MATERIALIZATION_RETRY",
        duration_ms: 0,
      });
  } finally {
    client.release();
  }
}

export async function closeWorkerPool(): Promise<void> {
  await pool?.end();
}

async function fail(client: import("pg").PoolClient, event: ClaimedEvent, code: string) {
  await client.query(
    `UPDATE outbox_event SET state = 'FAILED', "leaseExpiresAt" = NULL WHERE id = $1 AND state = 'PROCESSING' AND "leaseExpiresAt" = $2`,
    [event.id, event.leaseExpiresAt],
  );
  logger.warn("notification.failed", undefined, { code, duration_ms: 0 });
}

async function retry(client: import("pg").PoolClient, event: ClaimedEvent) {
  if (event.attempts >= 5) return fail(client, event, "NOTIFICATION_RETRY_EXHAUSTED");
  const delaySeconds = Math.min(300, 5 * 2 ** Math.max(0, event.attempts - 1));
  await client.query(
    `UPDATE outbox_event SET state = 'PENDING', "availableAt" = NOW() + ($2 * interval '1 second'), "leaseExpiresAt" = NULL WHERE id = $1 AND state = 'PROCESSING' AND "leaseExpiresAt" = $3`,
    [event.id, delaySeconds, event.leaseExpiresAt],
  );
  logger.warn("notification.retry", undefined, {
    code: "NOTIFICATION_MATERIALIZATION_RETRY",
    duration_ms: 0,
  });
}

async function observeBacklog(): Promise<void> {
  if (!pool) return;
  try {
    const result = await pool.query<{ oldest_age_ms: number | null }>(
      `SELECT EXTRACT(EPOCH FROM NOW() - MIN("createdAt")) * 1000 AS oldest_age_ms FROM outbox_event WHERE "eventType" = ANY($1) AND state IN ('PENDING', 'PROCESSING')`,
      [Object.keys(templates)],
    );
    const age = Number(result.rows[0]?.oldest_age_ms ?? 0);
    logger.info("notification.metric.backlog_age", undefined, {
      code: "NOTIFICATION_BACKLOG_AGE",
      duration_ms: Number.isFinite(age) && age > 0 ? Math.floor(age) : 0,
    });
    if (age >= 300_000)
      logger.warn("notification.alert.backlog_age", undefined, {
        code: "NOTIFICATION_BACKLOG_AGE_EXCEEDED",
        duration_ms: Math.floor(age),
      });
  } catch {
    logger.warn("notification.metric.unavailable", undefined, {
      code: "NOTIFICATION_METRICS_UNAVAILABLE",
      duration_ms: 0,
    });
  }
}

logWorkerEvent("worker.started");
if (process.env.WORKER_DISABLE_AUTO_START !== "1") {
  setInterval(() => void pollOnce(), intervalMs);
  setInterval(() => void observeBacklog(), 60_000);
}
