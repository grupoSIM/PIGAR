import assert from "node:assert/strict";
import test from "node:test";
import { AdminProfilesController } from "../apps/api/dist/identity/admin-profiles.controller.js";

const dispatcher = { profileId: "dispatcher", role: "DISPATCHER", subject: "synthetic" };
const admin = { profileId: "admin", role: "ADMIN", subject: "synthetic" };

test("[admin-profile-access] DISPATCHER no administra perfiles internos", async () => {
  const controller = new AdminProfilesController(database(), invitations());
  await assert.rejects(() => controller.list({ actor: dispatcher }), hasStatus(403));
});

test("[admin-profile-access] no permite degradar al último ADMIN", async () => {
  const controller = new AdminProfilesController(
    database({ role: "ADMIN", status: "ACTIVE" }),
    invitations(),
  );
  await assert.rejects(
    () => controller.changeRole({ actor: admin }, "target", { role: "DISPATCHER" }),
    hasStatus(409),
  );
});

test("[admin-profile-access] no permite auto-desactivación", async () => {
  const controller = new AdminProfilesController(database(), invitations());
  await assert.rejects(() => controller.deactivate({ actor: admin }, "admin"), hasStatus(409));
});

test("[auth-invitation] una clave procesada no vuelve a emitir una invitación", async () => {
  let invitations = 0;
  const controller = new AdminProfilesController(database({ claimedState: "PROCESSED" }), {
    createInvitation: async () => {
      invitations += 1;
    },
  });
  await controller.invite(
    { actor: admin },
    { email: "admin.synthetic@example.test", idempotencyKey: "synthetic-invitation-key-0001" },
  );
  assert.equal(invitations, 0);
});

test("[auth-log-sanitization] la auditoría conserva correlación pero no datos sensibles", async () => {
  const events = [];
  const data = database();
  data.accessAuditEvent.create = async ({ data: event }) => {
    events.push(event);
    return {};
  };
  const controller = new AdminProfilesController(data, invitations());
  await controller.changeRole(
    { actor: admin },
    "target",
    { role: "ADMIN" },
    "correlation-identity-0001",
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].correlationId, "correlation-identity-0001");
  assert.equal(events[0].eventType, "admin.profile.role_changed");
  assert.equal(
    /authorization|token|email|phone|synthetic-secret/i.test(JSON.stringify(events[0])),
    false,
  );
});

function database(target = { role: "DISPATCHER", status: "ACTIVE" }) {
  return {
    claimedJob: {
      create: async () => ({}),
      findUnique: async () => (target.claimedState ? { state: target.claimedState } : null),
      update: async () => ({}),
    },
    profile: {
      count: async () => 0,
      findMany: async () => [],
      findUniqueOrThrow: async () => ({ id: "target", ...target }),
      update: async () => ({ id: "target", ...target }),
    },
    accessAuditEvent: { create: async () => ({}) },
  };
}

function invitations() {
  return { createInvitation: async () => {} };
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}
