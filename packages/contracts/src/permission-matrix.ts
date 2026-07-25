import { OrderTransitionAction } from "./order-state-machine.js";

export const PERMISSION_MATRIX_VERSION = "v1";

/**
 * TECHNICIAN is an explicit denial-only subject for contract tests. It does not
 * represent a PIGAR account, session, token, portal, or API principal.
 */
export enum ActorRole {
  CLIENT = "CLIENT",
  DISPATCHER = "DISPATCHER",
  ADMIN = "ADMIN",
  VERIFIED_PROVIDER = "VERIFIED_PROVIDER",
  TECHNICIAN = "TECHNICIAN",
}

export enum PermissionAction {
  CREATE_OWN_REQUEST = "CREATE_OWN_REQUEST",
  READ_OWN_REQUEST = "READ_OWN_REQUEST",
  MANAGE_OWN_MEDIA = "MANAGE_OWN_MEDIA",
  INITIATE_OWN_PAYMENT = "INITIATE_OWN_PAYMENT",
  CONFIRM_OWN_CONFORMITY = "CONFIRM_OWN_CONFORMITY",
  READ_OPERATIONAL_REQUEST = "READ_OPERATIONAL_REQUEST",
  ASSIGN_TECHNICIAN = "ASSIGN_TECHNICIAN",
  UPDATE_OPERATIONAL_STATE = "UPDATE_OPERATIONAL_STATE",
  READ_OPERATIONAL_MEDIA = "READ_OPERATIONAL_MEDIA",
  MANAGE_INTERNAL_PROFILES = "MANAGE_INTERNAL_PROFILES",
  MANAGE_AUTHORIZED_CONFIGURATION = "MANAGE_AUTHORIZED_CONFIGURATION",
  APPLY_VERIFIED_PROVIDER_PAYMENT = "APPLY_VERIFIED_PROVIDER_PAYMENT",
  PROCESS_VERIFIED_JOB = "PROCESS_VERIFIED_JOB",
}

export type PermissionMatrix = Readonly<Record<ActorRole, readonly PermissionAction[]>>;

export const PERMISSION_MATRIX: PermissionMatrix = {
  [ActorRole.CLIENT]: [
    PermissionAction.CREATE_OWN_REQUEST,
    PermissionAction.READ_OWN_REQUEST,
    PermissionAction.MANAGE_OWN_MEDIA,
    PermissionAction.INITIATE_OWN_PAYMENT,
    PermissionAction.CONFIRM_OWN_CONFORMITY,
  ],
  [ActorRole.DISPATCHER]: [
    PermissionAction.READ_OPERATIONAL_REQUEST,
    PermissionAction.ASSIGN_TECHNICIAN,
    PermissionAction.UPDATE_OPERATIONAL_STATE,
    PermissionAction.READ_OPERATIONAL_MEDIA,
  ],
  [ActorRole.ADMIN]: [
    PermissionAction.READ_OPERATIONAL_REQUEST,
    PermissionAction.ASSIGN_TECHNICIAN,
    PermissionAction.UPDATE_OPERATIONAL_STATE,
    PermissionAction.READ_OPERATIONAL_MEDIA,
    PermissionAction.MANAGE_INTERNAL_PROFILES,
    PermissionAction.MANAGE_AUTHORIZED_CONFIGURATION,
  ],
  [ActorRole.VERIFIED_PROVIDER]: [
    PermissionAction.APPLY_VERIFIED_PROVIDER_PAYMENT,
    PermissionAction.PROCESS_VERIFIED_JOB,
  ],
  [ActorRole.TECHNICIAN]: [],
};

const operationalTransitions = new Set<OrderTransitionAction>([
  OrderTransitionAction.ASSIGN_TECHNICIAN,
  OrderTransitionAction.REASSIGN_TECHNICIAN,
  OrderTransitionAction.CANCEL,
  OrderTransitionAction.MARK_EN_ROUTE,
  OrderTransitionAction.START_SERVICE,
  OrderTransitionAction.FINISH_WORK,
  OrderTransitionAction.CREATE_FIXED_PAYMENT,
]);

export function canActorPerformAction(actor: ActorRole, action: PermissionAction): boolean {
  return PERMISSION_MATRIX[actor].includes(action);
}

export function canActorApplyOrderTransition(
  actor: ActorRole,
  transition: OrderTransitionAction,
): boolean {
  if (operationalTransitions.has(transition)) {
    return canActorPerformAction(actor, PermissionAction.UPDATE_OPERATIONAL_STATE);
  }

  if (transition === OrderTransitionAction.CONFIRM_PROVIDER_PAYMENT) {
    return canActorPerformAction(actor, PermissionAction.APPLY_VERIFIED_PROVIDER_PAYMENT);
  }

  return (
    transition === OrderTransitionAction.CONFIRM_CLIENT_CONFORMITY &&
    canActorPerformAction(actor, PermissionAction.CONFIRM_OWN_CONFORMITY)
  );
}
