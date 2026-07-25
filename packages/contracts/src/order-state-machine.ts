export const ORDER_STATE_MACHINE_VERSION = "v1";

export enum OrderState {
  REQUESTED = "SOLICITADA",
  TECHNICIAN_ASSIGNED = "TECNICO_ASIGNADO",
  EN_ROUTE = "EN_CAMINO",
  IN_SERVICE = "EN_ATENCION",
  WORK_FINISHED = "TRABAJO_FINALIZADO",
  PAYMENT_PENDING = "PENDIENTE_PAGO",
  CONFORMITY_PENDING = "PENDIENTE_CONFORMIDAD",
  CLOSED = "CERRADA",
  CANCELLED = "CANCELADA",
}

export enum PaymentState {
  CREATED = "CREATED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum OrderTransitionAction {
  ASSIGN_TECHNICIAN = "ASSIGN_TECHNICIAN",
  REASSIGN_TECHNICIAN = "REASSIGN_TECHNICIAN",
  CANCEL = "CANCEL",
  MARK_EN_ROUTE = "MARK_EN_ROUTE",
  START_SERVICE = "START_SERVICE",
  FINISH_WORK = "FINISH_WORK",
  CREATE_FIXED_PAYMENT = "CREATE_FIXED_PAYMENT",
  CONFIRM_PROVIDER_PAYMENT = "CONFIRM_PROVIDER_PAYMENT",
  CONFIRM_CLIENT_CONFORMITY = "CONFIRM_CLIENT_CONFORMITY",
}

export type OrderTransition = Readonly<{
  action: OrderTransitionAction;
  from: OrderState;
  to: OrderState;
  requiresReason: boolean;
  createsNewVersion: true;
  appendsImmutableHistory: true;
}>;

export type PaymentTransition = Readonly<{
  from: PaymentState;
  to: PaymentState;
}>;

/**
 * Transiciones permitidas por el contrato v1. La autorización por actor se
 * publica por separado para que ningún consumidor infiera permisos de esta tabla.
 */
export const ORDER_TRANSITIONS: readonly OrderTransition[] = [
  {
    action: OrderTransitionAction.ASSIGN_TECHNICIAN,
    from: OrderState.REQUESTED,
    to: OrderState.TECHNICIAN_ASSIGNED,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CANCEL,
    from: OrderState.REQUESTED,
    to: OrderState.CANCELLED,
    requiresReason: true,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.REASSIGN_TECHNICIAN,
    from: OrderState.TECHNICIAN_ASSIGNED,
    to: OrderState.TECHNICIAN_ASSIGNED,
    requiresReason: true,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.MARK_EN_ROUTE,
    from: OrderState.TECHNICIAN_ASSIGNED,
    to: OrderState.EN_ROUTE,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.START_SERVICE,
    from: OrderState.TECHNICIAN_ASSIGNED,
    to: OrderState.IN_SERVICE,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CANCEL,
    from: OrderState.TECHNICIAN_ASSIGNED,
    to: OrderState.CANCELLED,
    requiresReason: true,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.START_SERVICE,
    from: OrderState.EN_ROUTE,
    to: OrderState.IN_SERVICE,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CANCEL,
    from: OrderState.EN_ROUTE,
    to: OrderState.CANCELLED,
    requiresReason: true,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.FINISH_WORK,
    from: OrderState.IN_SERVICE,
    to: OrderState.WORK_FINISHED,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CREATE_FIXED_PAYMENT,
    from: OrderState.WORK_FINISHED,
    to: OrderState.PAYMENT_PENDING,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CONFIRM_PROVIDER_PAYMENT,
    from: OrderState.PAYMENT_PENDING,
    to: OrderState.CONFORMITY_PENDING,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
  {
    action: OrderTransitionAction.CONFIRM_CLIENT_CONFORMITY,
    from: OrderState.CONFORMITY_PENDING,
    to: OrderState.CLOSED,
    requiresReason: false,
    createsNewVersion: true,
    appendsImmutableHistory: true,
  },
];

export const PAYMENT_TRANSITIONS: readonly PaymentTransition[] = [
  { from: PaymentState.CREATED, to: PaymentState.PENDING },
  { from: PaymentState.CREATED, to: PaymentState.APPROVED },
  { from: PaymentState.CREATED, to: PaymentState.REJECTED },
  { from: PaymentState.CREATED, to: PaymentState.CANCELLED },
  { from: PaymentState.PENDING, to: PaymentState.APPROVED },
  { from: PaymentState.PENDING, to: PaymentState.REJECTED },
  { from: PaymentState.PENDING, to: PaymentState.CANCELLED },
];

export function findOrderTransition(
  from: OrderState,
  to: OrderState,
  action?: OrderTransitionAction,
): OrderTransition | undefined {
  return ORDER_TRANSITIONS.find(
    (transition) =>
      transition.from === from &&
      transition.to === to &&
      (action === undefined || transition.action === action),
  );
}

export function canTransitionOrder(
  from: OrderState,
  to: OrderState,
  action?: OrderTransitionAction,
): boolean {
  return findOrderTransition(from, to, action) !== undefined;
}

export function canTransitionPayment(from: PaymentState, to: PaymentState): boolean {
  return PAYMENT_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}

/** Only an approved provider payment may advance an order past payment pending. */
export function canAdvanceOrderAfterPayment(paymentState: PaymentState): boolean {
  return paymentState === PaymentState.APPROVED;
}
