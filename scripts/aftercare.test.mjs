import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AftercareService,
  RateLimitedException,
  validateIncident,
  validateRating,
} from "../apps/api/dist/aftercare/aftercare.service.js";
import { AftercareController } from "../apps/api/dist/aftercare/aftercare.controller.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("[feat-010] valida allowlists, OTRO normalizado y rechazo de superficies inseguras", () => {
  assert.deepEqual(validateRating({ stars: 5, reason: "OTRO", otherMessage: "  texto \uFF11  " }), {
    stars: 5,
    reason: "OTRO",
    otherMessage: "texto 1",
  });
  assert.throws(() => validateRating({ stars: 5, reason: "OTRO", otherMessage: "<b>x</b>" }));
  assert.throws(() =>
    validateRating({ stars: 5, reason: "OTRO", otherMessage: "www.invalid.test" }),
  );
  assert.throws(() => validateRating({ stars: 5, reason: "OTRO", otherMessage: "invalid.test" }));
  assert.throws(() => validateRating({ stars: 5, reason: "PUNTUALIDAD", otherMessage: "no" }));
  assert.throws(() => validateRating({ stars: 0, reason: "PUNTUALIDAD" }));
  assert.deepEqual(validateIncident({ type: "TRABAJO_INCOMPLETO" }), {
    type: "TRABAJO_INCOMPLETO",
  });
  assert.throws(() => validateIncident({ type: "TRABAJO_INCOMPLETO", comment: "x" }));
});
test("[feat-010] contrato y servicio preservan cierre, aislamiento y ausencia de outbox", async () => {
  const [service, contract] = await Promise.all([
    readFile(path.join(root, "apps/api/src/aftercare/aftercare.service.ts"), "utf8"),
    readFile(path.join(root, "specs/features/feat-010/api-contract.yaml"), "utf8"),
  ]);
  assert.match(contract, /\/v1\/requests\/\{requestId\}\/rating/);
  assert.match(contract, /\/v1\/admin\/incidents\/\{incidentId\}\/transitions/);
  assert.match(service, /ORDER_NOT_CLOSED/);
  assert.match(service, /IDEMPOTENCY_PAYLOAD_MISMATCH/);
  assert.match(service, /INCIDENT_TRANSITION_INVALID/);
  assert.doesNotMatch(service, /outboxEvent|paymentAttempt|conformity|charge\.update/i);
});
test("[feat-010] los proxies conservan filtros, cursor y Retry-After", async () => {
  const [adminRoute, customerIncidentsRoute, customerView] = await Promise.all([
    readFile(path.join(root, "apps/admin-web/app/api/operations/[...path]/route.ts"), "utf8"),
    readFile(path.join(root, "apps/customer-web/app/api/requests/[id]/incidents/route.ts"), "utf8"),
    readFile(path.join(root, "apps/customer-web/app/customer-requests.tsx"), "utf8"),
  ]);
  assert.match(adminRoute, /request\.nextUrl\.search/);
  assert.match(adminRoute, /path\[0\] === "operations" \? path\.slice\(1\) : path/);
  assert.match(adminRoute, /\/v1\/admin\/\$\{backendPath\}/);
  assert.match(adminRoute, /"retry-after"/);
  assert.match(customerIncidentsRoute, /request\.nextUrl\.search/);
  assert.match(customerIncidentsRoute, /"retry-after"/);
  assert.doesNotMatch(customerView, /incident\.history\.map\([\s\S]*occurredAt/);
  assert.match(customerView, /entry\.createdAt/);
});
test("[feat-010] aplica rate limits aprobados por perfil", () => {
  const service = new AftercareService({});
  for (let attempt = 0; attempt < 10; attempt += 1) service.limit("synthetic-client", "write");
  assert.throws(() => service.limit("synthetic-client", "write"), hasRetryAfter);
  for (let attempt = 0; attempt < 60; attempt += 1)
    service.limit("synthetic-operator", "transition");
  assert.throws(() => service.limit("synthetic-operator", "transition"), hasRetryAfter);
  for (let attempt = 0; attempt < 30; attempt += 1) service.limitIp("203.0.113.10");
  assert.throws(() => service.limitIp("203.0.113.10"), hasRetryAfter);
});
test("[feat-010] reintentos, cursor y Retry-After permanecen en el contrato de servicio", async () => {
  const [service, controller] = await Promise.all([
    readFile(path.join(root, "apps/api/src/aftercare/aftercare.service.ts"), "utf8"),
    readFile(path.join(root, "apps/api/src/aftercare/aftercare.controller.ts"), "utf8"),
  ]);
  assert.match(service, /private async replay\(/);
  assert.match(service, /nextCursor/);
  assert.match(service, /fingerprint\(\{ requestId, input \}\)/);
  assert.match(service, /fingerprint\(\{ incidentId: id, input \}\)/);
  assert.match(controller, /ParseUUIDPipe/);
  assert.match(controller, /cursor\.length < 1 \|\| cursor\.length > 512/);
  assert.match(controller, /Retry-After/);
  assert.match(controller, /\^\[A-Za-z0-9\._:-\]\+\$/);
});
test("[feat-010] una reserva ya confirmada se reproduce para el mismo idempotency key", async () => {
  const service = new AftercareService({
    aftercareIdempotency: {
      findUnique: async () => ({ payloadHash: "same", resultId: "rating-id" }),
    },
    orderRating: {
      findUnique: async () => ({
        id: "rating-id",
        stars: 5,
        reason: "PUNTUALIDAD",
        otherMessage: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
    },
  });
  const replay = await service.replay("actor", "rating", "key", "same", "rating");
  assert.deepEqual(replay, {
    id: "rating-id",
    stars: 5,
    reason: "PUNTUALIDAD",
    createdAt: "2026-09-01T00:00:00.000Z",
  });
});
test("[feat-010] lista paginada tiene límite estable y cursor opaco", async () => {
  const items = ["a", "b", "c"].map((id) => ({
    id: `00000000-0000-4000-8000-00000000000${id === "a" ? 1 : id === "b" ? 2 : 3}`,
    type: "TRABAJO_INCOMPLETO",
    status: "ABIERTA",
    version: 1,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    closedAt: null,
    workOrder: { requestId: "00000000-0000-4000-8000-000000000099" },
    transitions: [],
  }));
  const service = new AftercareService({
    aftercareIncident: {
      findMany: async (query) => {
        assert.equal(query.take, 3);
        return items;
      },
    },
    accessAuditEvent: { create: async () => ({}) },
  });
  service.orderForRead = async () => ({ id: "order" });
  const page = await service.incidents({ profileId: "client", role: "CLIENT" }, "request", {
    cursor: undefined,
    limit: 2,
  });
  assert.equal(page.items.length, 2);
  assert.equal(typeof page.nextCursor, "string");
});
test("[feat-010] el controlador emite Retry-After en 429", async () => {
  const controller = new AftercareController({});
  const headers = {};
  await assert.rejects(
    controller.respond(
      {
        header: (name, value) => {
          headers[name] = value;
        },
      },
      Promise.reject(new RateLimitedException(17)),
    ),
    { status: 429 },
  );
  assert.equal(headers["Retry-After"], "17");
});
function hasRetryAfter(error) {
  return (
    typeof error?.getStatus === "function" &&
    error.getStatus() === 429 &&
    typeof error.retryAfter === "string" &&
    Number(error.retryAfter) >= 1
  );
}
