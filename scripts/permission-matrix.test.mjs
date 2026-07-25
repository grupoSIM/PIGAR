import assert from "node:assert/strict";
import test from "node:test";
import {
  ActorRole,
  canActorApplyOrderTransition,
  canActorPerformAction,
  OrderTransitionAction,
  PermissionAction,
  PERMISSION_MATRIX,
} from "../packages/contracts/dist/index.js";

test("[permission-matrix] la matriz concede únicamente los alcances futuros aprobados", () => {
  const allowed = [
    [ActorRole.CLIENT, PermissionAction.CREATE_OWN_REQUEST],
    [ActorRole.CLIENT, PermissionAction.MANAGE_OWN_MEDIA],
    [ActorRole.DISPATCHER, PermissionAction.ASSIGN_TECHNICIAN],
    [ActorRole.DISPATCHER, PermissionAction.READ_OPERATIONAL_MEDIA],
    [ActorRole.ADMIN, PermissionAction.MANAGE_INTERNAL_PROFILES],
    [ActorRole.VERIFIED_PROVIDER, PermissionAction.APPLY_VERIFIED_PROVIDER_PAYMENT],
  ];

  for (const [actor, action] of allowed) {
    assert.equal(canActorPerformAction(actor, action), true);
  }
});

test("[permission-matrix] bloquea elevación de privilegios y acciones cruzadas", () => {
  const denied = [
    [ActorRole.CLIENT, PermissionAction.ASSIGN_TECHNICIAN],
    [ActorRole.CLIENT, PermissionAction.UPDATE_OPERATIONAL_STATE],
    [ActorRole.DISPATCHER, PermissionAction.MANAGE_INTERNAL_PROFILES],
    [ActorRole.DISPATCHER, PermissionAction.APPLY_VERIFIED_PROVIDER_PAYMENT],
    [ActorRole.ADMIN, PermissionAction.APPLY_VERIFIED_PROVIDER_PAYMENT],
    [ActorRole.VERIFIED_PROVIDER, PermissionAction.READ_OPERATIONAL_REQUEST],
  ];

  for (const [actor, action] of denied) {
    assert.equal(canActorPerformAction(actor, action), false);
  }
});

test("[permission-matrix] un técnico no tiene identidad ni permiso en PIGAR", () => {
  assert.deepEqual(PERMISSION_MATRIX[ActorRole.TECHNICIAN], []);

  for (const action of Object.values(PermissionAction)) {
    assert.equal(canActorPerformAction(ActorRole.TECHNICIAN, action), false);
  }

  for (const transition of Object.values(OrderTransitionAction)) {
    assert.equal(canActorApplyOrderTransition(ActorRole.TECHNICIAN, transition), false);
  }
});

test("[permission-matrix] solo los actores definidos ejecutan transiciones sensibles", () => {
  assert.equal(
    canActorApplyOrderTransition(ActorRole.DISPATCHER, OrderTransitionAction.ASSIGN_TECHNICIAN),
    true,
  );
  assert.equal(
    canActorApplyOrderTransition(ActorRole.ADMIN, OrderTransitionAction.FINISH_WORK),
    true,
  );
  assert.equal(
    canActorApplyOrderTransition(
      ActorRole.VERIFIED_PROVIDER,
      OrderTransitionAction.CONFIRM_PROVIDER_PAYMENT,
    ),
    true,
  );
  assert.equal(
    canActorApplyOrderTransition(ActorRole.CLIENT, OrderTransitionAction.CONFIRM_CLIENT_CONFORMITY),
    true,
  );
  assert.equal(
    canActorApplyOrderTransition(ActorRole.CLIENT, OrderTransitionAction.FINISH_WORK),
    false,
  );
});
