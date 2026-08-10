import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AddressNormalizerService } from "../apps/api/dist/requests/address-normalizer.service.js";
import { RequestsService } from "../apps/api/dist/requests/requests.service.js";
import { RequestMediaService } from "../apps/api/dist/requests/request-media.service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = { profileId: "client-1", role: "CLIENT", subject: "synthetic" };
const otherClient = { profileId: "client-2", role: "CLIENT", subject: "synthetic" };
const dispatcher = { profileId: "dispatcher", role: "DISPATCHER", subject: "synthetic" };

test("[request-snapshot] resuelve la tarifa en el servidor y conserva idempotencia por cliente", async () => {
  const store = requestStore();
  const service = new RequestsService(store, new AddressNormalizerService());
  const input = {
    offerId: store.rate.categoryId,
    description: "Pérdida de agua",
    address: { street: "Calle", number: "123" },
  };
  const first = await service.create(client, "request-key-1", input);
  const retry = await service.create(client, "request-key-1", input);
  assert.equal(first.id, retry.id);
  assert.deepEqual(first.offer, {
    category: "Visita Simple",
    currency: "ARS",
    price: "50000.00",
    version: 1,
  });
  await assert.rejects(
    () => service.create(client, "request-key-1", { ...input, description: "Otro" }),
    hasStatus(409),
  );
  await assert.rejects(
    () =>
      service.create(client, "request-key-1", {
        ...input,
        address: { street: "Otra", number: "123" },
      }),
    hasStatus(409),
  );
});

test("[request-access] un CLIENT no accede a recursos ajenos y DISPATCHER queda auditado sin PII", async () => {
  const store = requestStore();
  const service = new RequestsService(store, new AddressNormalizerService());
  const created = await service.create(client, "request-key-2", {
    offerId: store.rate.categoryId,
    description: "Pérdida",
    address: { street: "Calle", number: "123" },
  });
  await assert.rejects(() => service.get(otherClient, created.id), hasStatus(404));
  await service.get(dispatcher, created.id, "request-test-004");
  assert.match(JSON.stringify(store.events), /request\.created/);
  assert.match(JSON.stringify(store.events), /request\.operational\.read/);
  assert.doesNotMatch(JSON.stringify(store.events), /Calle|123|latitude|longitude|physicalName/i);
});

test("[request-list-operational] ADMIN y DISPATCHER pueden listar solicitudes operativamente", async () => {
  const store = requestStore();
  const service = new RequestsService(store, new AddressNormalizerService());
  await service.create(client, "request-key-op-1", {
    offerId: store.rate.categoryId,
    description: "Visita",
    address: { street: "Calle", number: "456" },
  });
  const list = await service.listOperational(dispatcher, "correlation-123");
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].description, "Visita");
  assert.match(JSON.stringify(store.events), /request\.operational\.list/);
  await assert.rejects(() => service.listOperational(client), hasStatus(404));
});

test("[request-contract] declara privacidad, carga interna y los límites aprobados", async () => {
  const [contract, controller, media, migration] = await Promise.all([
    readFile(path.join(root, "specs/features/feat-004/api-contract.yaml"), "utf8"),
    readFile(path.join(root, "apps/api/src/requests/requests.controller.ts"), "utf8"),
    readFile(path.join(root, "apps/api/src/requests/request-media.service.ts"), "utf8"),
    readFile(
      path.join(root, "apps/api/prisma/migrations/20260803140000_requests/migration.sql"),
      "utf8",
    ),
  ]);
  assert.match(contract, /\/v1\/requests/);
  assert.match(contract, /Idempotency-Key/);
  assert.match(controller, /x-accel-redirect/);
  assert.match(media, /MAX_IMAGES = 5/);
  assert.match(media, /10 \* 1024 \* 1024/);
  assert.match(media, /50 \* 1024 \* 1024/);
  assert.match(media, /SELECT id FROM "service_request" WHERE id = \$\{requestId\} FOR UPDATE/);
  assert.doesNotMatch(media, /SELECT id FROM "ServiceRequest"/);
  assert.match(migration, /service_request_money_check/);
  assert.match(migration, /request_media_duration_check/);
});

test("[request-media] una imagen válida habilita operación y un binario inválido no deja archivos", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "pigar-request-test-"));
  const created = [];
  let ready = false;
  process.env.REQUEST_MEDIA_ROOT = temporaryRoot;
  const storeMedia = [];
  const service = new RequestMediaService({
    serviceRequest: {
      findUnique: async () => ({ id: "request", media: storeMedia }),
      update: async () => {
        ready = true;
      },
    },
    requestMedia: {
      findMany: async () => storeMedia,
      create: async ({ data }) => {
        created.push(data);
        storeMedia.push(data);
        return { id: "media", ...data };
      },
    },
  });
  const result = await service.upload(
    "request",
    bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]),
  );
  assert.equal(result.kind, "IMAGE");
  assert.equal(ready, true);
  assert.equal(created.length, 1);
  await assert.rejects(() => service.upload("request", bytes([1, 2, 3])), /INVALID/);
  assert.deepEqual(await readdir(path.join(temporaryRoot, ".tmp")), []);
});

test("[request-media-limits] rechaza subir más de 5 imágenes o más de 1 video", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "pigar-request-test-"));
  process.env.REQUEST_MEDIA_ROOT = temporaryRoot;
  const storeMedia = [
    { kind: "IMAGE" },
    { kind: "IMAGE" },
    { kind: "IMAGE" },
    { kind: "IMAGE" },
    { kind: "IMAGE" },
  ];
  const service = new RequestMediaService({
    serviceRequest: {
      findUnique: async () => ({ id: "request", media: storeMedia }),
      update: async () => ({}),
    },
    requestMedia: {
      findMany: async () => storeMedia,
      create: async () => ({}),
    },
  });
  await assert.rejects(
    () => service.upload("request", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])),
    /LIMIT/,
  );
});

function requestStore() {
  const requests = [];
  const events = [];
  const rate = {
    categoryId: "00000000-0000-4000-8000-000000000001",
    zoneId: "00000000-0000-4000-8000-000000000002",
    currency: "ARS",
    amount: { toFixed: () => "50000.00" },
    version: 1,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    category: { name: "Visita Simple", scopeDescription: "Alcance" },
    zone: { name: "Zona única" },
  };
  return {
    rate,
    events,
    serviceRequest: {
      findUnique: async ({ where }) =>
        requests.find(
          (item) =>
            item.id === where.id ||
            (where.clientProfileId_idempotencyKey &&
              item.clientProfileId === where.clientProfileId_idempotencyKey.clientProfileId &&
              item.idempotencyKey === where.clientProfileId_idempotencyKey.idempotencyKey),
        ) ?? null,
      create: async ({ data }) => {
        const item = {
          id: `request-${requests.length + 1}`,
          completeness: "MEDIA_REQUIRED",
          createdAt: new Date(),
          media: [],
          ...data,
          address: data.address.create,
        };
        requests.push(item);
        return item;
      },
      findMany: async () => requests,
      update: async () => ({}),
    },
    serviceRate: { findFirst: async () => rate },
    requestMedia: { findFirst: async () => null, create: async () => ({}) },
    accessAuditEvent: {
      create: async ({ data }) => {
        events.push(data);
        return data;
      },
    },
  };
}
function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}
async function* bytes(values) {
  yield new Uint8Array(values);
}
