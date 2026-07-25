import { loadWorkerConfiguration } from "@pigar/config";
import { createLogger } from "@pigar/observability";

const { pollIntervalMs: intervalMs } = loadWorkerConfiguration(process.env);
const logger = createLogger({
  environment: process.env.NODE_ENV ?? "development",
  service: "worker",
});

function logWorkerEvent(event: string): void {
  logger.info(event, undefined, { code: "OK", duration_ms: 0 });
}

function poll(): void {
  // TASK-004 sustituirá este ciclo por el reclamo transaccional de jobs desde PostgreSQL.
  logWorkerEvent("worker.poll.idle");
}

logWorkerEvent("worker.started");
setInterval(poll, intervalMs);
