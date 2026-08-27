import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DatabaseService } from "../apps/api/dist/database.service.js";
import { BillingService } from "../apps/api/dist/billing/billing.service.js";

test("[feat-007][postgres] resolución, conciliación y conformidad preservan evidencia", async () => {
  const database = new DatabaseService();
  const token = randomUUID();
  const providerPayments = new Map();
  const provider = {
    async createPreference(input) {
      return { checkoutUrl: `https://sandbox.example/checkout/${input.externalReference}` };
    },
    async getPayment(id) {
      const payment = providerPayments.get(id);
      if (!payment) throw new Error("synthetic provider payment not found");
      return payment;
    },
    async searchPayments(reference) {
      return [...providerPayments.values()].filter(
        (payment) => payment.externalReference === reference,
      );
    },
    async findPreference() {
      return undefined;
    },
  };
  const billing = new BillingService(database, provider);
  try {
    await database.$connect();
    const [client, operator] = await Promise.all([
      database.profile.create({
        data: { identitySubject: `synthetic-client-${token}`, role: "CLIENT" },
      }),
      database.profile.create({
        data: { identitySubject: `synthetic-operator-${token}`, role: "ADMIN" },
      }),
    ]);
    const request = await database.serviceRequest.create({
      data: {
        clientProfileId: client.id,
        idempotencyKey: `synthetic-request-${token}`,
        description: "Solicitud sintética para validación técnica",
        completeness: "READY_FOR_OPERATION",
        categoryId: randomUUID(),
        categoryName: "Servicio",
        categoryScope: "sintético",
        zoneId: randomUUID(),
        zoneName: "Zona sintética",
        currency: "ARS",
        amount: "50.00",
        rateVersion: 1,
        rateValidFrom: new Date(),
      },
    });
    const order = await database.workOrder.create({
      data: { requestId: request.id, state: "TRABAJO_FINALIZADO", version: 1 },
    });
    const operatorActor = { profileId: operator.id, role: "ADMIN", subject: "synthetic" };
    const clientActor = { profileId: client.id, role: "CLIENT", subject: "synthetic" };

    const resolutionKey = randomUUID();
    const resolutionInput = {
      outcome: "RESUELTO_EN_VISITA",
      summary: "Resolución sintética",
      expectedOrderVersion: 1,
    };
    const resolved = await billing.resolve(operatorActor, order.id, resolutionKey, resolutionInput);
    assert.equal(resolved.state, "PENDIENTE_PAGO");
    assert.equal(resolved.charge.currency, "ARS");
    assert.equal(
      (await billing.resolve(operatorActor, order.id, resolutionKey, resolutionInput)).id,
      order.id,
    );

    const checkout = await billing.startCheckout(clientActor, request.id, 2);
    assert.match(checkout.checkoutUrl, /^https:\/\//);
    const attempt = await database.paymentAttempt.findUniqueOrThrow({
      where: { id: checkout.attemptId },
    });
    await assert.rejects(
      database.paymentAttempt.create({
        data: {
          chargeId: attempt.chargeId,
          sequence: attempt.sequence + 1,
          externalReference: `pg_${randomUUID().replaceAll("-", "")}`,
        },
      }),
    );
    const paymentId = `synthetic-payment-${token}`;
    providerPayments.set(paymentId, {
      id: paymentId,
      status: "approved",
      externalReference: attempt.externalReference,
      currency: "ARS",
      amount: "50.00",
    });

    assert.equal(await billing.reconcilePending(), 1);
    const afterApproval = await database.workOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(afterApproval.state, "PENDIENTE_CONFORMIDAD");
    assert.equal(afterApproval.version, 3);

    const authoritative = providerPayments.get(paymentId);
    await billing.applyProviderPayment({ ...authoritative, status: "pending" });
    const afterLateEvent = await database.workOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(afterLateEvent.state, "PENDIENTE_CONFORMIDAD");

    const conformity = await billing.conformity(clientActor, request.id, "v1", 3);
    assert.equal(conformity.orderState, "CERRADA");

    const resolution = await database.resolution.findUniqueOrThrow({
      where: { workOrderId: order.id },
    });
    await assert.rejects(
      database.$executeRaw`UPDATE "resolution" SET "summary" = 'mutación' WHERE "id" = ${resolution.id}`,
    );
  } finally {
    await database.$disconnect();
  }
});
