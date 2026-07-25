import assert from "node:assert/strict";
import test from "node:test";
import {
  hashIdentifier,
  InMemoryPaymentPocStore,
  PaymentPocService,
  signWebhook,
} from "../apps/api/dist/payment-poc/payment-poc.service.js";

const secret = "synthetic-webhook-secret";

function provider(statusById) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async getPayment(id) {
      calls += 1;
      const status = statusById.get(id);
      if (!status) throw new Error("provider unavailable");
      return { id, status };
    },
  };
}

test("[payment-webhook] PoC autentica eventos y solo aprueba mediante consulta autoritativa", async () => {
  const source = provider(
    new Map([
      ["pay-approved", "approved"],
      ["pay-pending", "pending"],
    ]),
  );
  const store = new InMemoryPaymentPocStore();
  const service = new PaymentPocService(source, store, secret);
  const approved = { eventId: "evt-approved", paymentId: "pay-approved", type: "payment" };

  assert.deepEqual(await service.processWebhook(approved, signWebhook(approved, secret)), {
    outcome: "APPLIED",
    status: "APPROVED",
  });
  const invalid = { eventId: "evt-invalid", paymentId: "pay-pending", type: "payment" };
  assert.deepEqual(await service.processWebhook(invalid, "00"), { outcome: "INVALID_SIGNATURE" });
  assert.equal(source.calls, 1);
  assert.equal(store.paymentStatus(hashIdentifier("pay-approved")), "APPROVED");
  assert.equal(store.paymentStatus(hashIdentifier("pay-pending")), undefined);
});

test("[payment-idempotency] PoC deduplica eventos simultáneos y no degrada una confirmación", async () => {
  const source = provider(new Map([["pay-1", "approved"]]));
  const store = new InMemoryPaymentPocStore();
  const service = new PaymentPocService(source, store, secret);
  const event = { eventId: "evt-duplicated", paymentId: "pay-1", type: "payment" };
  const signature = signWebhook(event, secret);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => service.processWebhook(event, signature)),
  );

  assert.equal(results.filter((result) => result.outcome === "APPLIED").length, 1);
  assert.equal(results.filter((result) => result.outcome === "DUPLICATE").length, 7);
  assert.equal(source.calls, 1);
  assert.equal(store.paymentStatus(hashIdentifier("pay-1")), "APPROVED");
});

test("PoC tolera eventos fuera de orden sin inferir una aprobación", async () => {
  const statuses = new Map([["pay-ordered", "pending"]]);
  const source = provider(statuses);
  const store = new InMemoryPaymentPocStore();
  const service = new PaymentPocService(source, store, secret);
  const pendingEvent = { eventId: "evt-pending", paymentId: "pay-ordered", type: "payment" };
  const approvedEvent = {
    eventId: "evt-approved-later",
    paymentId: "pay-ordered",
    type: "payment",
  };

  await service.processWebhook(pendingEvent, signWebhook(pendingEvent, secret));
  assert.equal(store.paymentStatus(hashIdentifier("pay-ordered")), "PENDING");
  statuses.set("pay-ordered", "approved");
  await service.processWebhook(approvedEvent, signWebhook(approvedEvent, secret));
  assert.equal(store.paymentStatus(hashIdentifier("pay-ordered")), "APPROVED");
});

test("[payment-reconciliation] PoC concilia una intención pendiente sin webhook y deja trazabilidad mínima", async () => {
  const source = provider(new Map([["pay-lost-event", "approved"]]));
  const store = new InMemoryPaymentPocStore();
  store.seedPending("pay-lost-event");
  const service = new PaymentPocService(source, store, secret);

  assert.equal(await service.reconcilePending(), 1);
  assert.equal(store.paymentStatus(hashIdentifier("pay-lost-event")), "APPROVED");
  assert.equal(source.calls, 1);
});
