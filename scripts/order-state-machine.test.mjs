import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdvanceOrderAfterPayment,
  canTransitionOrder,
  canTransitionPayment,
  findOrderTransition,
  OrderState,
  OrderTransitionAction,
  PaymentState,
} from "../packages/contracts/dist/index.js";

test("[order-state-machine] la tabla acepta solamente las transiciones de orden v1", () => {
  const allowed = [
    [OrderState.REQUESTED, OrderState.TECHNICIAN_ASSIGNED],
    [OrderState.TECHNICIAN_ASSIGNED, OrderState.EN_ROUTE],
    [OrderState.TECHNICIAN_ASSIGNED, OrderState.IN_SERVICE],
    [OrderState.EN_ROUTE, OrderState.IN_SERVICE],
    [OrderState.IN_SERVICE, OrderState.WORK_FINISHED],
    [OrderState.WORK_FINISHED, OrderState.PAYMENT_PENDING],
    [OrderState.PAYMENT_PENDING, OrderState.CONFORMITY_PENDING],
    [OrderState.CONFORMITY_PENDING, OrderState.CLOSED],
  ];
  const rejected = [
    [OrderState.REQUESTED, OrderState.IN_SERVICE],
    [OrderState.IN_SERVICE, OrderState.PAYMENT_PENDING],
    [OrderState.PAYMENT_PENDING, OrderState.CLOSED],
    [OrderState.CLOSED, OrderState.CANCELLED],
    [OrderState.CANCELLED, OrderState.REQUESTED],
  ];

  for (const [from, to] of allowed) assert.equal(canTransitionOrder(from, to), true);
  for (const [from, to] of rejected) assert.equal(canTransitionOrder(from, to), false);
});

test("[order-state-machine] reasignar conserva el estado pero exige una nueva versión e historial", () => {
  const transition = findOrderTransition(
    OrderState.TECHNICIAN_ASSIGNED,
    OrderState.TECHNICIAN_ASSIGNED,
    OrderTransitionAction.REASSIGN_TECHNICIAN,
  );

  assert.deepEqual(transition, {
    action: OrderTransitionAction.REASSIGN_TECHNICIAN,
    from: OrderState.TECHNICIAN_ASSIGNED,
    to: OrderState.TECHNICIAN_ASSIGNED,
    requiresReason: true,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  });
  assert.equal(
    canTransitionOrder(
      OrderState.TECHNICIAN_ASSIGNED,
      OrderState.TECHNICIAN_ASSIGNED,
      OrderTransitionAction.ASSIGN_TECHNICIAN,
    ),
    false,
  );
});

test("[order-state-machine] la tabla de pago no permite reescrituras de estados terminales", () => {
  const allowed = [
    [PaymentState.CREATED, PaymentState.PENDING],
    [PaymentState.CREATED, PaymentState.APPROVED],
    [PaymentState.PENDING, PaymentState.REJECTED],
    [PaymentState.PENDING, PaymentState.CANCELLED],
  ];
  const rejected = [
    [PaymentState.APPROVED, PaymentState.PENDING],
    [PaymentState.REJECTED, PaymentState.APPROVED],
    [PaymentState.CANCELLED, PaymentState.APPROVED],
  ];

  for (const [from, to] of allowed) assert.equal(canTransitionPayment(from, to), true);
  for (const [from, to] of rejected) assert.equal(canTransitionPayment(from, to), false);
});

test("[order-state-machine] pago pendiente o rechazado no adelanta la orden", () => {
  assert.equal(canAdvanceOrderAfterPayment(PaymentState.PENDING), false);
  assert.equal(canAdvanceOrderAfterPayment(PaymentState.REJECTED), false);
  assert.equal(canAdvanceOrderAfterPayment(PaymentState.APPROVED), true);
});
