import assert from "node:assert/strict";
import test from "node:test";
import { correlationId, createLogger } from "../packages/observability/dist/index.js";

test("[log-sanitization] los logs incluyen contexto mínimo y descartan datos sensibles", () => {
  const entries = [];
  const logger = createLogger({
    environment: "test",
    service: "api",
    write: (entry) => entries.push(entry),
  });
  const requestId = "correlation-test-0001";
  logger.info("technical.operation", requestId, {
    authorization: "Bearer synthetic-secret",
    code: "OK",
    duration_ms: 12,
    payload: "synthetic-sensitive-payload",
  });

  assert.equal(entries.length, 1);
  assert.deepEqual(Object.keys(entries[0]).sort(), [
    "code",
    "correlation_id",
    "duration_ms",
    "environment",
    "event",
    "level",
    "service",
    "timestamp",
  ]);
  assert.equal(entries[0].correlation_id, requestId);
  assert.equal(entries[0].duration_ms, 12);
  assert.equal(JSON.stringify(entries[0]).includes("synthetic-secret"), false);
  assert.equal(JSON.stringify(entries[0]).includes("synthetic-sensitive-payload"), false);
  assert.match(correlationId(undefined), /^[0-9a-f-]{36}$/);
});
