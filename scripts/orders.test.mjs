import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  OrderState,
  OrderTransitionAction,
  canTransitionOrder,
  findOrderTransition,
} from "../packages/contracts/dist/index.js";
import { OrdersService } from "../apps/api/dist/orders/orders.service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[order-state-machine] sólo permite hitos operativos v1 y exige motivos", () => {
  assert.equal(
    canTransitionOrder(
      OrderState.TECHNICIAN_ASSIGNED,
      OrderState.EN_ROUTE,
      OrderTransitionAction.MARK_EN_ROUTE,
    ),
    true,
  );
  assert.equal(
    canTransitionOrder(
      OrderState.EN_ROUTE,
      OrderState.WORK_FINISHED,
      OrderTransitionAction.FINISH_WORK,
    ),
    false,
  );
  assert.equal(
    findOrderTransition(
      OrderState.TECHNICIAN_ASSIGNED,
      OrderState.TECHNICIAN_ASSIGNED,
      OrderTransitionAction.REASSIGN_TECHNICIAN,
    )?.requiresReason,
    true,
  );
  assert.equal(
    findOrderTransition(OrderState.EN_ROUTE, OrderState.CANCELLED, OrderTransitionAction.CANCEL)
      ?.requiresReason,
    true,
  );
});

test("[order-contract] declara unicidad, versión, historial y proyección CLIENT sin PII", async () => {
  const [migration, service, contract] = await Promise.all([
    readFile(
      path.join(root, "apps/api/prisma/migrations/20260814090000_operational_orders/migration.sql"),
      "utf8",
    ),
    readFile(path.join(root, "apps/api/src/orders/orders.service.ts"), "utf8"),
    readFile(path.join(root, "specs/features/feat-005/api-contract.yaml"), "utf8"),
  ]);
  assert.match(migration, /work_order_requestId_key/);
  assert.match(migration, /work_order_transition_order_version_key/);
  assert.match(migration, /assignment_idempotency_actor_key/);
  assert.match(migration, /technician_active_phone_check/);
  assert.match(migration, /work_order_transition_append_only/);
  assert.match(service, /ORDER_VERSION_CONFLICT/);
  assert.match(service, /IDEMPOTENCY_PAYLOAD_MISMATCH/);
  assert.match(service, /safeCustomerView/);
  assert.doesNotMatch(
    service.slice(service.indexOf("safeCustomerView"), service.indexOf("operationalView")),
    /phone|reason/,
  );
  assert.match(contract, /\/v1\/requests\/\{requestId\}\/order/);
});

test("[order-service] asigna de forma idempotente, aplica versión y oculta PII al CLIENT", async () => {
  const store = orderStore();
  const service = new OrdersService(store);
  const assigned = await service.assign(admin, "request-1", "technician-1", "assignment-1");
  assert.equal(assigned.state, "TECNICO_ASIGNADO");
  assert.equal(assigned.version, 1);
  const retry = await service.assign(admin, "request-1", "technician-1", "assignment-1");
  assert.equal(retry.id, assigned.id);
  await assert.rejects(
    () => service.assign(admin, "request-1", "technician-1", "assignment-1-different"),
    hasStatus(409),
  );
  await assert.rejects(
    () =>
      service.transition(admin, assigned.id, {
        action: OrderTransitionAction.MARK_EN_ROUTE,
        expectedVersion: 99,
      }),
    hasStatus(409),
  );
  const enRoute = await service.transition(admin, assigned.id, {
    action: OrderTransitionAction.MARK_EN_ROUTE,
    expectedVersion: 1,
  });
  assert.equal(enRoute.version, 2);
  assert.deepEqual(
    store.events.filter((item) => item.aggregateType === "work_order").map((item) => item.eventType),
    ["work_order.assignment_changed", "work_order.en_route"],
  );
  const customer = await service.customerView(client, "request-1");
  assert.deepEqual(customer.technician, { fullName: "Técnico sintético" });
  assert.doesNotMatch(JSON.stringify(customer), /555|motivo interno|technician-1/i);
  await assert.rejects(() => service.customerView(otherClient, "request-1"), hasStatus(404));
});

const admin = { profileId: "admin-1", role: "ADMIN", subject: "synthetic" };
const client = { profileId: "client-1", role: "CLIENT", subject: "synthetic" };
const otherClient = { profileId: "client-2", role: "CLIENT", subject: "synthetic" };

function orderStore() {
  const technician = {
    id: "technician-1",
    fullName: "Técnico sintético",
    phone: "+54 11 5555 0000",
    status: "ACTIVE",
  };
  const request = {
    id: "request-1",
    completeness: "READY_FOR_OPERATION",
    clientProfileId: "client-1",
  };
  const assignments = [];
  const orders = [];
  const events = [];
  const store = {
    events,
    $transaction: async (operation) => operation(store),
    technician: {
      findUnique: async ({ where }) => (where.id === technician.id ? technician : null),
      findMany: async () => [technician],
      create: async ({ data }) => ({ id: "technician-2", ...data }),
      update: async ({ where, data }) => ({ ...technician, ...data, id: where.id }),
    },
    serviceRequest: { findUnique: async ({ where }) => (where.id === request.id ? request : null) },
    assignmentIdempotency: {
      findUnique: async ({ where }) => {
        const entry = assignments.find(
          (item) =>
            item.actorProfileId === where.actorProfileId_idempotencyKey.actorProfileId &&
            item.idempotencyKey === where.actorProfileId_idempotencyKey.idempotencyKey,
        );
        return entry
          ? { ...entry, workOrder: orders.find((item) => item.id === entry.workOrderId) ?? null }
          : null;
      },
      create: async ({ data }) => {
        const entry = { id: `reservation-${assignments.length + 1}`, ...data };
        assignments.push(entry);
        return entry;
      },
      update: async ({ where, data }) => {
        const entry = assignments.find((item) => item.id === where.id);
        Object.assign(entry, data);
        return entry;
      },
    },
    workOrder: {
      create: async ({ data }) => {
        if (orders.some((item) => item.requestId === data.requestId)) {
          const error = new Error("unique");
          error.code = "P2002";
          throw error;
        }
        const order = {
          id: `order-${orders.length + 1}`,
          requestId: data.requestId,
          technicianId: data.technicianId,
          state: data.state,
          version: data.version,
          createdAt: new Date(),
          updatedAt: new Date(),
          technician,
          transitions: [{ ...data.transitions.create, id: "transition-1", createdAt: new Date() }],
        };
        orders.push(order);
        return order;
      },
      findMany: async () => orders,
      findUnique: async ({ where }) => {
        const order = orders.find(
          (item) => item.id === where.id || item.requestId === where.requestId,
        );
        return order ? { ...order, request } : null;
      },
      update: async ({ where, data }) => {
        const order = orders.find((item) => item.id === where.id);
        Object.assign(order, {
          state: data.state,
          technicianId: data.technicianId,
          version: data.version,
          updatedAt: new Date(),
        });
        order.transitions.push({
          ...data.transitions.create,
          id: `transition-${order.transitions.length + 1}`,
          createdAt: new Date(),
        });
        return order;
      },
    },
    accessAuditEvent: {
      create: async ({ data }) => {
        events.push(data);
        return data;
      },
    },
    outboxEvent: {
      create: async ({ data }) => {
        events.push(data);
        return { id: `event-${events.length}`, ...data };
      },
    },
  };
  return store;
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}
