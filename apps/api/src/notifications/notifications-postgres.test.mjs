import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import process from "node:process";
import test from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { bootstrap } from "../../dist/index.js";
import { DatabaseService } from "../../dist/database.service.js";
import { BillingService } from "../../dist/billing/billing.service.js";
import { OrdersService } from "../../dist/orders/orders.service.js";
import { OrderTransitionAction } from "@pigar/contracts";
import { NotificationsService } from "../../dist/notifications/notifications.service.js";
import { IdentityGuard } from "../../dist/identity/identity.guard.js";

process.env.WORKER_DISABLE_AUTO_START = "1";
const { pollOnce, closeWorkerPool } = await import("../../../worker/dist/index.js");

async function fixture(database) {
  const token = randomUUID();
  const client = await database.profile.create({
    data: { identitySubject: `notifications-client-${token}`, role: "CLIENT" },
  });
  const other = await database.profile.create({
    data: { identitySubject: `notifications-other-${token}`, role: "CLIENT" },
  });
  const request = await database.serviceRequest.create({
    data: {
      clientProfileId: client.id,
      idempotencyKey: `notifications-request-${token}`,
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
  return { client, other, request };
}

test("[notifications][postgres] dos workers, lease vencido y receptor inválido conservan estados seguros", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const { client, other, request } = await fixture(database);
  const ids = [];
  t.after(async () => {
    await database.transactionalNotification.deleteMany({
      where: { recipientProfileId: { in: [client.id, other.id] } },
    });
    await database.outboxEvent.deleteMany({ where: { id: { in: ids } } });
    await database.serviceRequest.delete({ where: { id: request.id } });
    await database.profile.deleteMany({ where: { id: { in: [client.id, other.id] } } });
    await database.$disconnect();
  });

  const event = await database.outboxEvent.create({
    data: { eventType: "work_order.en_route", version: 1, payload: { requestId: request.id } },
  });
  ids.push(event.id);
  await Promise.all([pollOnce(), pollOnce()]);
  assert.equal(
    await database.transactionalNotification.count({ where: { sourceEventId: event.id } }),
    1,
  );
  assert.equal(
    (await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).state,
    "PROCESSED",
  );

  const expired = await database.outboxEvent.create({
    data: {
      eventType: "payment.rejected",
      version: 1,
      state: "PROCESSING",
      leaseExpiresAt: new Date(Date.now() - 1_000),
      payload: { requestId: request.id },
    },
  });
  ids.push(expired.id);
  await pollOnce();
  assert.equal(
    (await database.outboxEvent.findUniqueOrThrow({ where: { id: expired.id } })).state,
    "PROCESSED",
  );

  const invalid = await database.outboxEvent.create({
    data: { eventType: "work_order.closed", version: 1, payload: { requestId: randomUUID() } },
  });
  ids.push(invalid.id);
  await pollOnce();
  assert.equal(
    (await database.outboxEvent.findUniqueOrThrow({ where: { id: invalid.id } })).state,
    "FAILED",
  );
  const indexes = await database.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'transactional_notification'
  `;
  const indexNames = indexes.map((row) => row.indexname);
  assert.ok(indexNames.includes("transactional_notification_source_recipient_key"));
  assert.ok(indexNames.includes("transactional_notification_recipient_created_id_idx"));
  assert.ok(indexNames.includes("transactional_notification_recipient_unread_idx"));
  await assert.rejects(database.outboxEvent.delete({ where: { id: event.id } }));
});

test("[notifications][postgres] la API pagina por propietario y conserva la primera lectura", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const { client, other, request } = await fixture(database);
  const sourceIds = [];
  const notificationIds = [];
  t.after(async () => {
    await database.accessAuditEvent.deleteMany({
      where: { actorProfileId: { in: [client.id, other.id] } },
    });
    await database.transactionalNotification.deleteMany({ where: { id: { in: notificationIds } } });
    await database.outboxEvent.deleteMany({ where: { id: { in: sourceIds } } });
    await database.serviceRequest.delete({ where: { id: request.id } });
    await database.profile.deleteMany({ where: { id: { in: [client.id, other.id] } } });
    await database.$disconnect();
  });
  for (let index = 0; index < 3; index += 1) {
    const source = await database.outboxEvent.create({
      data: {
        eventType: "work_order.en_route",
        version: 1,
        state: "PROCESSED",
        payload: { requestId: request.id },
      },
    });
    sourceIds.push(source.id);
    const notice = await database.transactionalNotification.create({
      data: {
        sourceEventId: source.id,
        recipientProfileId: client.id,
        requestId: request.id,
        eventType: "WORK_ORDER_EN_ROUTE",
        templateKey: "technician-en-route",
        templateVersion: 1,
        createdAt: new Date(Date.now() - index * 1_000),
      },
    });
    notificationIds.push(notice.id);
  }
  const service = new NotificationsService(database);
  const actor = { profileId: client.id, role: "CLIENT", subject: "synthetic" };
  const first = await service.list(actor, undefined, "2");
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = await service.list(actor, first.nextCursor, "2");
  assert.equal(second.items.length, 1);
  assert.equal((await service.list({ ...actor, profileId: other.id })).items.length, 0);
  const [one, two] = await Promise.all([
    service.markRead(actor, first.items[0].id),
    service.markRead(actor, first.items[0].id),
  ]);
  assert.ok(one.readAt);
  assert.equal(one.readAt, two.readAt);
  await assert.rejects(service.markRead({ ...actor, profileId: other.id }, first.items[0].id));
  const durations = [];
  for (let index = 0; index < 25; index += 1) {
    const startedAt = performance.now();
    await service.list(actor, undefined, "20");
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  assert.ok(durations[23] < 250, `p95 local ${durations[23].toFixed(2)}ms supera 250ms`);
});

test("[notifications][http] contrato devuelve 401, 403, 404 y errores seguros", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const { client, other, request } = await fixture(database);
  const source = await database.outboxEvent.create({
    data: {
      eventType: "work_order.en_route",
      version: 1,
      state: "PROCESSED",
      payload: { requestId: request.id },
    },
  });
  const notice = await database.transactionalNotification.create({
    data: {
      sourceEventId: source.id,
      recipientProfileId: client.id,
      requestId: request.id,
      eventType: "WORK_ORDER_EN_ROUTE",
      templateKey: "technician-en-route",
      templateVersion: 1,
    },
  });
  const original = IdentityGuard.prototype.canActivate;
  IdentityGuard.prototype.canActivate = async (context) => {
    const requestContext = context.switchToHttp().getRequest();
    const value = requestContext.headers["x-notification-test-actor"];
    if (typeof value !== "string") throw new UnauthorizedException();
    const [role, profileId] = value.split(":");
    requestContext.actor = { role, profileId, subject: "synthetic" };
    return true;
  };
  const app = await bootstrap();
  t.after(async () => {
    IdentityGuard.prototype.canActivate = original;
    await app.close();
    await database.transactionalNotification.delete({ where: { id: notice.id } });
    await database.outboxEvent.delete({ where: { id: source.id } });
    await database.serviceRequest.delete({ where: { id: request.id } });
    await database.profile.deleteMany({ where: { id: { in: [client.id, other.id] } } });
    await database.$disconnect();
  });
  const clientHeader = { "x-notification-test-actor": `CLIENT:${client.id}` };
  assert.equal((await app.inject({ method: "GET", url: "/api/v1/notifications" })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/api/v1/notifications",
        headers: { "x-notification-test-actor": `ADMIN:${client.id}` },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: "/api/v1/notifications?limit=51",
        headers: clientHeader,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/api/v1/notifications?cursor=${"x".repeat(513)}`,
        headers: clientHeader,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: `/api/v1/notifications/${notice.id}/read`,
        headers: { "x-notification-test-actor": `CLIENT:${other.id}` },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: `/api/v1/notifications/${notice.id}/read`,
        headers: clientHeader,
      })
    ).statusCode,
    200,
  );
});

test("[notifications][postgres] asignación, reasignación, camino y cancelación emiten outbox sólo al transicionar", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const { request } = await fixture(database);
  const operator = await database.profile.create({
    data: { identitySubject: `notifications-operator-${randomUUID()}`, role: "ADMIN" },
  });
  const technicians = await Promise.all([
    database.technician.create({
      data: { fullName: "Técnico A", phone: "+541100000001", status: "ACTIVE" },
    }),
    database.technician.create({
      data: { fullName: "Técnico B", phone: "+541100000002", status: "ACTIVE" },
    }),
  ]);
  t.after(async () => {
    await database.$disconnect();
  });
  const orders = new OrdersService(database);
  const actor = { profileId: operator.id, role: "ADMIN", subject: "synthetic" };
  const assigned = await orders.assign(actor, request.id, technicians[0].id, randomUUID());
  await orders.transition(actor, assigned.id, {
    action: OrderTransitionAction.REASSIGN_TECHNICIAN,
    expectedVersion: 1,
    technicianId: technicians[1].id,
    reason: "sintético",
  });
  await orders.transition(actor, assigned.id, {
    action: OrderTransitionAction.MARK_EN_ROUTE,
    expectedVersion: 2,
  });
  await orders.transition(actor, assigned.id, {
    action: OrderTransitionAction.CANCEL,
    expectedVersion: 3,
    reason: "sintético",
  });
  const events = await database.outboxEvent.findMany({
    where: { aggregateId: assigned.id },
    orderBy: { createdAt: "asc" },
  });
  assert.deepEqual(
    events.map((event) => event.eventType),
    [
      "work_order.assignment_changed",
      "work_order.assignment_changed",
      "work_order.en_route",
      "work_order.cancelled",
    ],
  );
  await orders.assign(actor, request.id, technicians[0].id, randomUUID()).catch(() => undefined);
  assert.equal(await database.outboxEvent.count({ where: { aggregateId: assigned.id } }), 4);
});

test("[notifications][postgres] conciliaciones concurrentes emiten un único pago rechazado", async (t) => {
  const database = new DatabaseService();
  await database.$connect();
  const { request } = await fixture(database);
  const order = await database.workOrder.create({
    data: { requestId: request.id, state: "PENDIENTE_PAGO", version: 1 },
  });
  const charge = await database.charge.create({
    data: {
      workOrderId: order.id,
      categoryName: "Servicio",
      offerVersion: 1,
      currency: "ARS",
      amount: "1.00",
    },
  });
  const attempt = await database.paymentAttempt.create({
    data: {
      chargeId: charge.id,
      sequence: 1,
      externalReference: `payment-${randomUUID()}`,
      state: "PENDING",
    },
  });
  t.after(async () => {
    await database.$disconnect();
  });
  const billing = new BillingService(database, {
    createPreference: async () => ({ checkoutUrl: "https://synthetic.example" }),
    getPayment: async () => {
      throw new Error("not used");
    },
    searchPayments: async () => [],
    findPreference: async () => undefined,
  });
  const payment = {
    id: `provider-${randomUUID()}`,
    status: "rejected",
    externalReference: attempt.externalReference,
    currency: "ARS",
    amount: "1.00",
  };
  await Promise.all([billing.applyProviderPayment(payment), billing.applyProviderPayment(payment)]);
  assert.equal(
    await database.outboxEvent.count({
      where: { aggregateId: order.id, eventType: "payment.rejected" },
    }),
    1,
  );
  assert.equal(
    (await database.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).state,
    "REJECTED",
  );
});

test.after(async () => {
  await closeWorkerPool();
});
