import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { bootstrap } from "../../dist/index.js";
import { DatabaseService } from "../../dist/database.service.js";
import { IdentityGuard } from "../../dist/identity/identity.guard.js";
import { AftercareService } from "../../dist/aftercare/aftercare.service.js";

const key = () => `aftercare-${randomUUID()}`;
const actor = (profile, role = profile.role) => ({
  profileId: profile.id,
  role,
  subject: `aftercare-test-${profile.id}`,
});

async function fixture(database) {
  const token = randomUUID();
  const client = await database.profile.create({
    data: { identitySubject: `aftercare-client-${token}`, role: "CLIENT" },
  });
  const other = await database.profile.create({
    data: { identitySubject: `aftercare-other-${token}`, role: "CLIENT" },
  });
  const admin = await database.profile.create({
    data: { identitySubject: `aftercare-admin-${token}`, role: "ADMIN" },
  });
  const makeOrder = async (owner = client) => {
    const request = await database.serviceRequest.create({
      data: {
        clientProfileId: owner.id,
        idempotencyKey: `aftercare-request-${randomUUID()}`,
        description: "Solicitud sintética",
        completeness: "READY_FOR_OPERATION",
        categoryId: randomUUID(),
        categoryName: "Servicio",
        categoryScope: "sintético",
        zoneId: randomUUID(),
        zoneName: "Zona sintética",
        currency: "ARS",
        amount: "1.00",
        rateVersion: 1,
        rateValidFrom: new Date(),
      },
    });
    const order = await database.workOrder.create({
      data: { requestId: request.id, state: "CERRADA", version: 1 },
    });
    return { request, order };
  };
  return { client, other, admin, makeOrder };
}

function status(error) {
  return error instanceof ConflictException && error.getStatus() === 409;
}

async function protectedSnapshot(database, orderId) {
  const [order, transitions, charge, outbox, notifications] = await Promise.all([
    database.workOrder.findUnique({
      where: { id: orderId },
      select: { state: true, version: true, createdAt: true, updatedAt: true },
    }),
    database.workOrderTransition.findMany({
      where: { workOrderId: orderId },
      orderBy: { createdAt: "asc" },
    }),
    database.charge.findUnique({
      where: { workOrderId: orderId },
      include: { attempts: { orderBy: { sequence: "asc" } }, conformity: true },
    }),
    database.outboxEvent.count(),
    database.transactionalNotification.count(),
  ]);
  return JSON.parse(JSON.stringify({ order, transitions, charge, outbox, notifications }));
}

test("[feat-010][postgres] carreras de servicio conservan replay y conflictos sin P2002", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const data = await fixture(database);
  const rating = await data.makeOrder();
  const ratingActor = actor(data.client);
  const ratingBefore = await protectedSnapshot(database, rating.order.id);
  t.after(async () => database.$disconnect());

  const sameRatingKey = key();
  const concurrentRatings = await Promise.all(
    Array.from({ length: 20 }, () =>
      new AftercareService(database).createRating(
        ratingActor,
        rating.request.id,
        sameRatingKey,
        { stars: 5, reason: "PUNTUALIDAD" },
        randomUUID(),
      ),
    ),
  );
  assert.equal(new Set(concurrentRatings.map((value) => value.id)).size, 1);
  assert.equal(await database.orderRating.count({ where: { workOrderId: rating.order.id } }), 1);
  assert.deepEqual(await protectedSnapshot(database, rating.order.id), ratingBefore);
  await assert.rejects(
    new AftercareService(database).createRating(ratingActor, rating.request.id, sameRatingKey, {
      stars: 4,
      reason: "PUNTUALIDAD",
    }),
    status,
  );

  const secondRating = await data.makeOrder();
  const secondRatingBefore = await protectedSnapshot(database, secondRating.order.id);
  const differentRatingKeys = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      new AftercareService(database).createRating(
        ratingActor,
        secondRating.request.id,
        key(),
        { stars: 5, reason: "PUNTUALIDAD" },
        randomUUID(),
      ),
    ),
  );
  assert.equal(differentRatingKeys.filter((result) => result.status === "fulfilled").length, 1);
  assert.ok(
    differentRatingKeys
      .filter((result) => result.status === "rejected")
      .every((result) => status(result.reason)),
  );
  assert.equal(
    await database.orderRating.count({ where: { workOrderId: secondRating.order.id } }),
    1,
  );
  assert.deepEqual(await protectedSnapshot(database, secondRating.order.id), secondRatingBefore);

  const scopedKey = key();
  const scopedFirst = await data.makeOrder();
  const scopedSecond = await data.makeOrder();
  await new AftercareService(database).createRating(
    ratingActor,
    scopedFirst.request.id,
    scopedKey,
    { stars: 5, reason: "PUNTUALIDAD" },
  );
  await assert.rejects(
    new AftercareService(database).createRating(ratingActor, scopedSecond.request.id, scopedKey, {
      stars: 5,
      reason: "PUNTUALIDAD",
    }),
    status,
  );
  assert.equal(
    await database.orderRating.count({ where: { workOrderId: scopedSecond.order.id } }),
    0,
  );

  const incidentOrder = await data.makeOrder();
  const incidentBefore = await protectedSnapshot(database, incidentOrder.order.id);
  const sameIncidentKey = key();
  const concurrentIncidents = await Promise.all(
    Array.from({ length: 20 }, () =>
      new AftercareService(database).createIncident(
        ratingActor,
        incidentOrder.request.id,
        sameIncidentKey,
        { type: "TRABAJO_INCOMPLETO" },
        randomUUID(),
      ),
    ),
  );
  const incidentId = concurrentIncidents[0].id;
  assert.equal(new Set(concurrentIncidents.map((value) => value.id)).size, 1);
  assert.equal(
    await database.aftercareIncident.count({ where: { workOrderId: incidentOrder.order.id } }),
    1,
  );
  await assert.rejects(
    new AftercareService(database).createIncident(
      ratingActor,
      incidentOrder.request.id,
      sameIncidentKey,
      { type: "DANIO_REPORTADO" },
    ),
    status,
  );

  const operator = actor(data.admin);
  const sameTransitionKey = key();
  const transitions = await Promise.all(
    Array.from({ length: 20 }, () =>
      new AftercareService(database).transition(operator, incidentId, sameTransitionKey, {
        action: "START_TRIAGE",
        expectedVersion: 1,
      }),
    ),
  );
  assert.equal(new Set(transitions.map((value) => value.version)).size, 1);
  assert.equal(transitions[0].version, 2);
  await assert.rejects(
    new AftercareService(database).transition(operator, incidentId, key(), {
      action: "CLOSE",
      expectedVersion: 1,
    }),
    status,
  );
  const closed = await new AftercareService(database).transition(operator, incidentId, key(), {
    action: "CLOSE",
    expectedVersion: 2,
  });
  assert.equal(closed.status, "CERRADA");
  assert.deepEqual(
    closed.history.map((entry) => entry.action),
    ["OPEN", "START_TRIAGE", "CLOSE"],
  );
  const reopenedAsNew = await new AftercareService(database).createIncident(
    ratingActor,
    incidentOrder.request.id,
    key(),
    { type: "DANIO_REPORTADO" },
  );
  assert.notEqual(reopenedAsNew.id, incidentId);
  const pageOne = await new AftercareService(database).adminOrder(
    operator,
    incidentOrder.order.id,
    {
      cursor: undefined,
      limit: 1,
    },
  );
  assert.equal(pageOne.incidents.items.length, 1);
  assert.equal(typeof pageOne.incidents.nextCursor, "string");
  const pageTwo = await new AftercareService(database).adminOrder(
    operator,
    incidentOrder.order.id,
    {
      cursor: pageOne.incidents.nextCursor,
      limit: 1,
    },
  );
  assert.equal(pageTwo.incidents.items.length, 1);
  assert.notEqual(pageOne.incidents.items[0].id, pageTwo.incidents.items[0].id);
  assert.equal(pageTwo.incidents.nextCursor, null);
  assert.deepEqual(await protectedSnapshot(database, incidentOrder.order.id), incidentBefore);

  const privateRating = await data.makeOrder();
  const privateBefore = await protectedSnapshot(database, privateRating.order.id);
  const privateLogs = [];
  const originalLog = globalThis.console.log;
  globalThis.console.log = (...parts) => privateLogs.push(parts.map(String).join(" "));
  try {
    const receipt = await new AftercareService(database).createRating(
      ratingActor,
      privateRating.request.id,
      key(),
      { stars: 5, reason: "OTRO", otherMessage: "synthetic-private-content" },
    );
    assert.equal("otherMessage" in receipt, false);
  } finally {
    globalThis.console.log = originalLog;
  }
  const audits = await database.accessAuditEvent.findMany({
    where: { actorProfileId: data.client.id, eventType: "aftercare.rating.create" },
    select: { metadata: true, correlationId: true, outcome: true },
  });
  assert.equal(JSON.stringify(audits).includes("synthetic-private-content"), false);
  assert.equal(privateLogs.join(" ").includes("synthetic-private-content"), false);
  assert.deepEqual(await protectedSnapshot(database, privateRating.order.id), privateBefore);

  const durations = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const startedAt = performance.now();
    await new AftercareService(database).adminOrder(operator, incidentOrder.order.id, {
      cursor: undefined,
      limit: 20,
    });
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  assert.ok(durations[Math.ceil(durations.length * 0.95) - 1] < 500);
});

test("[feat-010][http] Nest/Fastify aplica contrato de errores, límites y soporte paginado", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const data = await fixture(database);
  const own = await data.makeOrder();
  const crossed = await data.makeOrder(data.other);
  const original = IdentityGuard.prototype.canActivate;
  IdentityGuard.prototype.canActivate = async (context) => {
    const request = context.switchToHttp().getRequest();
    const header = request.headers["x-aftercare-test-actor"];
    if (typeof header !== "string") throw new UnauthorizedException();
    const [role, profileId] = header.split(":");
    request.actor = { role, profileId, subject: "synthetic" };
    return true;
  };
  const app = await bootstrap();
  t.after(async () => {
    IdentityGuard.prototype.canActivate = original;
    await app.close();
    await database.$disconnect();
  });
  const clientHeader = { "x-aftercare-test-actor": `CLIENT:${data.client.id}` };
  const adminHeader = { "x-aftercare-test-actor": `ADMIN:${data.admin.id}` };
  const json = { ...clientHeader, "content-type": "application/json", "idempotency-key": key() };
  const ratingUrl = `/api/v1/requests/${own.request.id}/rating`;

  assert.equal((await app.inject({ method: "GET", url: ratingUrl })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: ratingUrl,
        headers: { ...json, "x-aftercare-test-actor": `ADMIN:${data.admin.id}` },
        payload: { stars: 5, reason: "PUNTUALIDAD" },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await app.inject({ method: "GET", url: ratingUrl, headers: adminHeader })).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/api/v1/requests/${own.request.id}/incidents`,
        headers: adminHeader,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/api/v1/requests/${crossed.request.id}/rating`,
        headers: json,
        payload: { stars: 5, reason: "PUNTUALIDAD" },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: ratingUrl,
        headers: json,
        payload: { stars: 5, reason: "PUNTUALIDAD" },
      })
    ).statusCode,
    201,
  );
  const replayHttp = await app.inject({
    method: "POST",
    url: ratingUrl,
    headers: json,
    payload: { stars: 5, reason: "PUNTUALIDAD" },
  });
  assert.equal(replayHttp.statusCode, 200);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: ratingUrl,
        headers: { ...json, "idempotency-key": key() },
        payload: { stars: 4, reason: "PUNTUALIDAD" },
      })
    ).statusCode,
    409,
  );
  const rejectedAudits = await database.accessAuditEvent.count({
    where: { outcome: { in: ["CONFLICT", "RATE_LIMITED"] } },
  });
  assert.ok(rejectedAudits > 0);
  const invalidBody = await app.inject({
    method: "POST",
    url: `/api/v1/requests/${(await data.makeOrder()).request.id}/rating`,
    headers: json,
    payload: { stars: 5, reason: "PUNTUALIDAD", extra: true },
  });
  assert.equal(invalidBody.statusCode, 400);
  assert.match(invalidBody.headers["content-type"], /application\/problem\+json/);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: ratingUrl,
        headers: { ...clientHeader, "idempotency-key": key(), "content-type": "application/xml" },
        payload: "<bad/>",
      })
    ).statusCode,
    415,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: ratingUrl,
        headers: { ...json, "idempotency-key": key() },
        payload: { stars: 5, reason: "OTRO", otherMessage: "x".repeat(9000) },
      })
    ).statusCode,
    413,
  );
  const exhausted = await data.makeOrder();
  const exhaustedUrl = `/api/v1/requests/${exhausted.request.id}/rating`;
  for (let count = 0; count < 10; count += 1) {
    await app.inject({
      method: "POST",
      url: exhaustedUrl,
      headers: { ...json, "idempotency-key": key() },
      payload: { stars: 5, reason: "PUNTUALIDAD" },
    });
  }
  const limited = await app.inject({
    method: "POST",
    url: exhaustedUrl,
    headers: { ...json, "idempotency-key": key() },
    payload: { stars: 5, reason: "PUNTUALIDAD" },
  });
  assert.equal(limited.statusCode, 429);
  assert.match(limited.headers["retry-after"], /^[1-9]\d*$/);
  const invalidCursor = Buffer.from(JSON.stringify({ id: randomUUID() }), "utf8").toString(
    "base64url",
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/api/v1/requests/${own.request.id}/incidents?cursor=${invalidCursor}`,
        headers: clientHeader,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/api/v1/requests/${own.request.id}/incidents?cursor=${"x".repeat(513)}`,
        headers: clientHeader,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/api/v1/requests/not-a-uuid/incidents",
        headers: clientHeader,
      })
    ).statusCode,
    400,
  );

  const openFixture = await data.makeOrder();
  const open = await database.workOrder.update({
    where: { id: openFixture.order.id },
    data: { state: "SOLICITADA" },
  });
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/api/v1/admin/orders/${open.id}/aftercare`,
        headers: adminHeader,
      })
    ).statusCode,
    409,
  );

  const incident = await new AftercareService(database).createIncident(
    actor(data.other),
    crossed.request.id,
    key(),
    { type: "TRABAJO_INCOMPLETO" },
  );
  const transitionHttp = await app.inject({
    method: "POST",
    url: `/api/v1/admin/incidents/${incident.id}/transitions`,
    headers: {
      ...adminHeader,
      "content-type": "application/json",
      "idempotency-key": key(),
    },
    payload: { action: "START_TRIAGE", expectedVersion: 1 },
  });
  assert.equal(transitionHttp.statusCode, 200);
  const support = await app.inject({
    method: "GET",
    url: `/api/v1/admin/orders/${crossed.order.id}/aftercare?limit=1`,
    headers: adminHeader,
  });
  assert.equal(support.statusCode, 200);
  const supportBody = support.json();
  assert.deepEqual(Object.keys(supportBody).sort(), [
    "incidents",
    "orderId",
    "orderState",
    "rating",
  ]);
  assert.deepEqual(Object.keys(supportBody.incidents).sort(), ["items", "nextCursor"]);
  assert.equal(supportBody.incidents.items[0].id, incident.id);
  assert.deepEqual(Object.keys(supportBody.incidents.items[0]).sort(), [
    "closedAt",
    "createdAt",
    "history",
    "id",
    "requestId",
    "status",
    "type",
    "updatedAt",
    "version",
  ]);
  assert.deepEqual(Object.keys(supportBody.incidents.items[0].history[0]).sort(), [
    "action",
    "actorRole",
    "createdAt",
    "fromStatus",
    "sequence",
    "toStatus",
  ]);
});
