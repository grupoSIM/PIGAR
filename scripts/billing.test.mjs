import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BillingService } from "../apps/api/dist/billing/billing.service.js";
import { validWebhookSignature } from "../apps/api/dist/billing/mercado-pago-webhook.controller.js";
import { PaymentProviderFailure } from "../apps/api/dist/billing/payment-provider.error.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

test("[feat-007] migración conserva historial, unicidad y restricciones monetarias", async () => {
  const migration = [
    await source(
      "apps/api/prisma/migrations/20260827090000_feat_007_resolution_payment/migration.sql",
    ),
    await source(
      "apps/api/prisma/migrations/20260827100000_feat_007_payment_attempt_hardening/migration.sql",
    ),
  ].join("\n");
  for (const required of [
    "PENDIENTE_PAGO",
    "PENDIENTE_CONFORMIDAD",
    "CERRADA",
    "resolution_command_actor_key",
    "charge_workOrderId_key",
    "payment_attempt_externalReference_key",
    "payment_attempt_charge_sequence_key",
    "charge_currency_check",
    "charge_amount_check",
    "resolution_append_only",
    "charge_append_only",
    "conformity_append_only",
    "payment_attempt_one_active_per_charge_key",
    "UNKNOWN",
  ])
    assert.match(migration, new RegExp(required));
});

test("[feat-007] checkout y webhook sólo avanzan tras validación autoritativa", async () => {
  const [billing, webhook, provider] = await Promise.all([
    source("apps/api/src/billing/billing.service.ts"),
    source("apps/api/src/billing/mercado-pago-webhook.controller.ts"),
    source("apps/api/src/billing/mercado-pago.provider.ts"),
  ]);
  assert.match(billing, /order\.request\.currency !== "ARS"/);
  assert.match(billing, /PREFERENCE_CREATION_UNCERTAIN/);
  assert.match(billing, /state !== "APPROVED"/);
  assert.match(webhook, /x-signature/);
  assert.match(webhook, /x-request-id/);
  assert.match(webhook, /data\.id/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(webhook, /claimedJob\.upsert/);
  assert.match(webhook, /mercado-pago-payment-reconciliation/);
  assert.match(provider, /\/v1\/payments\//);
  assert.match(provider, /external_reference/);
});

test("[feat-007] valida firma HMAC, componentes requeridos y ventana anti-replay", () => {
  const secret = "test-webhook-secret";
  const requestId = "test-request";
  const dataId = "test-payment";
  const ts = "1700000000";
  const signature = createHmac("sha256", secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest("hex");
  assert.equal(
    validWebhookSignature(`ts=${ts},v1=${signature}`, requestId, dataId, secret, 1_700_000_010_000),
    true,
  );
  assert.equal(
    validWebhookSignature(`ts=${ts},v1=${signature}`, requestId, dataId, secret, 1_700_000_400_001),
    false,
  );
});

test("[feat-007] contrato no autoriza retornos de navegador ni aprobación humana", async () => {
  const [contract, controller] = await Promise.all([
    source("specs/features/feat-007/api-contract.yaml"),
    source("apps/api/src/billing/billing.controller.ts"),
  ]);
  assert.match(contract, /payment-attempts/);
  assert.match(contract, /mercado-pago/);
  assert.doesNotMatch(controller, /approved.*@Post/i);
});

test("[feat-007] reutiliza un intento activo y no vuelve a crear una preferencia", async () => {
  const store = checkoutStore();
  const calls = [];
  const service = new BillingService(store, {
    async createPreference(input) {
      calls.push(input);
      return { checkoutUrl: "https://sandbox.mercadopago.example/checkout" };
    },
    async getPayment() {
      throw new Error("not used");
    },
    async searchPayments() {
      return [];
    },
    async findPreference() {
      return undefined;
    },
  });
  const actor = { profileId: "client-1", role: "CLIENT", subject: "synthetic" };
  const first = await service.startCheckout(actor, "request-1", 4);
  const second = await service.startCheckout(actor, "request-1", 4);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].currency, "ARS");
  assert.equal(calls[0].title, "Servicio PIGAR");
  assert.match(calls[0].externalReference, /^pg_[a-f0-9]{32}$/);
});

test("[feat-007] no degrada un estado terminal por un evento tardío", async () => {
  const attempt = {
    id: "attempt-1",
    state: "REJECTED",
    charge: {
      currency: "ARS",
      amount: decimal("50.00"),
      workOrder: { id: "order-1", state: "PENDIENTE_PAGO" },
    },
  };
  let updates = 0;
  const service = new BillingService(
    {
      paymentAttempt: {
        findUnique: async () => attempt,
        update: async () => {
          updates += 1;
        },
      },
      $transaction: async (operation) => operation({}),
    },
    {
      createPreference: async () => ({ checkoutUrl: "https://example.invalid" }),
      getPayment: async () => {
        throw new Error("not used");
      },
      searchPayments: async () => [],
      findPreference: async () => undefined,
    },
  );
  assert.equal(
    await service.applyProviderPayment({
      id: "provider-1",
      status: "pending",
      externalReference: "opaque",
      currency: "ARS",
      amount: "50.00",
    }),
    "REJECTED",
  );
  assert.equal(updates, 0);
});

test("[feat-007] una creación ambigua queda recuperable y no duplica preferencia", async () => {
  const store = checkoutStore();
  let calls = 0;
  const service = new BillingService(store, {
    async createPreference() {
      calls += 1;
      throw new Error("synthetic timeout");
    },
    async getPayment() {
      throw new Error("not used");
    },
    async searchPayments() {
      return [];
    },
    async findPreference() {
      return undefined;
    },
  });
  const actor = { profileId: "client-1", role: "CLIENT", subject: "synthetic" };
  await assert.rejects(service.startCheckout(actor, "request-1", 4));
  await assert.rejects(service.startCheckout(actor, "request-1", 4));
  assert.equal(calls, 1);
  assert.equal(store.paymentAttempt.state(), "UNKNOWN");
});

test("[feat-007] un rechazo confirmado no bloquea un nuevo intento", async () => {
  const store = checkoutStore();
  let calls = 0;
  const service = new BillingService(store, {
    async createPreference() {
      calls += 1;
      if (calls === 1)
        throw new PaymentProviderFailure("not_created", "PAYMENT_PROVIDER_REJECTED");
      return { checkoutUrl: "https://sandbox.mercadopago.example/checkout" };
    },
    async getPayment() {
      throw new Error("not used");
    },
    async searchPayments() {
      return [];
    },
    async findPreference() {
      return undefined;
    },
  });
  const actor = { profileId: "client-1", role: "CLIENT", subject: "synthetic" };
  await assert.rejects(service.startCheckout(actor, "request-1", 4));
  assert.equal(store.paymentAttempt.state(), "CANCELLED");
  const retry = await service.startCheckout(actor, "request-1", 4);
  assert.equal(retry.reused, false);
  assert.equal(calls, 2);
});

function checkoutStore() {
  const attempts = [];
  const charge = { id: "charge-1", amount: decimal("50.00"), attempts };
  const order = {
    id: "order-1",
    requestId: "request-1",
    state: "PENDIENTE_PAGO",
    version: 4,
    request: { clientProfileId: "client-1" },
    charge,
  };
  return {
    workOrder: { findUnique: async () => order },
    paymentAttempt: {
      create: async ({ data }) => {
        const item = { id: `attempt-${attempts.length + 1}`, state: "CREATED", ...data };
        attempts.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const item = attempts.find((entry) => entry.id === where.id);
        Object.assign(item, data);
        return item;
      },
      state: () => attempts[0]?.state,
    },
    accessAuditEvent: { create: async () => undefined },
  };
}
function decimal(value) {
  return { toFixed: () => value };
}
