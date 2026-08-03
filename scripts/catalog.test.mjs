import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AdminCatalogController } from "../apps/api/dist/catalog/catalog.controller.js";
import { CatalogService } from "../apps/api/dist/catalog/catalog.service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const admin = { profileId: "admin", role: "ADMIN", subject: "synthetic" };
const dispatcher = { profileId: "dispatcher", role: "DISPATCHER", subject: "synthetic" };
const client = { profileId: "client", role: "CLIENT", subject: "synthetic" };

test("[catalog-money-resolution] una oferta vigente publica sólo datos comerciales y ARS decimal", async () => {
  const service = new CatalogService({
    coverageZone: { findFirst: async () => ({ id: "zone" }) },
    serviceRate: {
      findMany: async () => [
        {
          amount: { toFixed: () => "50000.00" },
          category: {
            description: "Diagnóstico y visita.",
            id: "category",
            name: "Visita Simple",
            scopeDescription: "Incluye visita; excedentes requieren presupuesto.",
          },
          currency: "ARS",
          version: 1,
        },
      ],
    },
  });
  assert.deepEqual(await service.publicOffers(new Date("2026-08-02T00:00:00.000Z")), {
    items: [
      {
        category: {
          description: "Diagnóstico y visita.",
          id: "category",
          name: "Visita Simple",
          scope: "Incluye visita; excedentes requieren presupuesto.",
        },
        currency: "ARS",
        price: "50000.00",
        version: 1,
      },
    ],
  });
});

test("[catalog-access] CLIENT y DISPATCHER no administran; DISPATCHER sólo consulta", async () => {
  const events = [];
  const controller = new AdminCatalogController(catalog(), {
    accessAuditEvent: { create: async ({ data }) => events.push(data) },
  });
  await assert.rejects(
    () => controller.createCategory({ actor: client }, categoryInput()),
    hasStatus(403),
  );
  await assert.rejects(
    () => controller.createCategory({ actor: dispatcher }, categoryInput()),
    hasStatus(403),
  );
  await controller.list({ actor: dispatcher });
  await controller.createCategory({ actor: admin }, categoryInput(), "catalog-security-0001");
  assert.deepEqual(events, [
    {
      actorProfileId: "admin",
      correlationId: "catalog-security-0001",
      eventType: "catalog.category.created",
      metadata: { resourceId: "category" },
      outcome: "SUCCESS",
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /email|phone|token|secret|address|latitude|longitude/i,
  );
});

test("[catalog-validation] rechaza coma flotante, moneda distinta de ARS y vigencia inválida", async () => {
  const controller = new AdminCatalogController(catalog(), {
    accessAuditEvent: { create: async () => ({}) },
  });
  for (const body of [
    {
      categoryId: id(),
      zoneId: id(),
      currency: "ARS",
      amount: 50000,
      validFrom: "2026-08-02T00:00:00Z",
    },
    {
      categoryId: id(),
      zoneId: id(),
      currency: "USD",
      amount: "50000.00",
      validFrom: "2026-08-02T00:00:00Z",
    },
    {
      categoryId: id(),
      zoneId: id(),
      currency: "ARS",
      amount: "50000.00",
      validFrom: "2026-08-03T00:00:00Z",
      validUntil: "2026-08-02T00:00:00Z",
    },
  ]) {
    await assert.rejects(() => controller.createRate({ actor: admin }, body), hasStatus(409));
  }
});

test("[catalog-zone] rechaza una segunda zona activa en el MVP", async () => {
  const service = new CatalogService({
    coverageZone: {
      findFirst: async () => ({ id: "active-zone" }),
      findUnique: async () => ({ id: "other-zone" }),
      update: async () => ({ id: "other-zone" }),
    },
  });
  await assert.rejects(() => service.activateZone("other-zone"), hasStatus(409));
});

test("[catalog-migration-contract] la migración evita zonas activas múltiples y solapamientos publicados", async () => {
  const [migration, contract] = await Promise.all([
    readFile(
      path.join(root, "apps/api/prisma/migrations/20260802090000_catalog/migration.sql"),
      "utf8",
    ),
    readFile(path.join(root, "specs/features/feat-003/api-contract.yaml"), "utf8"),
  ]);
  assert.match(migration, /coverage_zone_single_active/);
  assert.match(migration, /service_rate_no_published_validity_overlap/);
  assert.match(migration, /50000\.00/);
  assert.match(contract, /\/v1\/catalog\/offers/);
  assert.match(contract, /\/v1\/admin\/catalog\/rates/);
});

function catalog() {
  return {
    createCategory: async () => ({ id: "category" }),
    createRate: async () => ({ id: "rate" }),
    createZone: async () => ({ id: "zone" }),
    operationalCatalog: async () => [],
    publishRate: async () => ({ id: "rate" }),
    retireRate: async () => ({ id: "rate" }),
    setCategoryStatus: async () => ({ id: "category" }),
    updateCategory: async () => ({ id: "category" }),
    activateZone: async () => ({ id: "zone" }),
  };
}

function categoryInput() {
  return { description: "Diagnóstico", name: "Visita", scopeDescription: "Alcance" };
}

function id() {
  return "00000000-0000-4000-8000-000000000001";
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}
