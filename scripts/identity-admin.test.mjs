import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AdminProfilesController } from "../apps/api/dist/identity/admin-profiles.controller.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dispatcher = { profileId: "dispatcher", role: "DISPATCHER", subject: "synthetic" };
const admin = { profileId: "admin", role: "ADMIN", subject: "synthetic" };

test("[admin-profile-access] DISPATCHER no administra perfiles internos", async () => {
  const controller = new AdminProfilesController(database(), provisioning());
  await assert.rejects(() => controller.list({ actor: dispatcher }), hasStatus(403));
});

test("[admin-profile-access] no permite degradar al último ADMIN", async () => {
  const controller = new AdminProfilesController(
    database({ role: "ADMIN", status: "ACTIVE" }),
    provisioning(),
  );
  await assert.rejects(
    () => controller.changeRole({ actor: admin }, "target", { role: "DISPATCHER" }),
    hasStatus(409),
  );
});

test("[admin-profile-access] no permite auto-desactivación", async () => {
  const controller = new AdminProfilesController(database(), provisioning());
  await assert.rejects(() => controller.deactivate({ actor: admin }, "admin"), hasStatus(409));
});

test("[auth-provisioning] una clave procesada no vuelve a aprovisionar una cuenta", async () => {
  let provisions = 0;
  const controller = new AdminProfilesController(database({ claimedState: "PROCESSED" }), {
    provisionInternalAccount: async () => {
      provisions += 1;
      return "auth0|synthetic";
    },
  });
  await controller.provision(
    { actor: admin },
    {
      email: "admin.synthetic@example.test",
      idempotencyKey: "synthetic-provision-key-0001",
      role: "DISPATCHER",
    },
  );
  assert.equal(provisions, 0);
});

test("[auth-log-sanitization] la auditoría conserva correlación pero no datos sensibles", async () => {
  const events = [];
  const data = database();
  data.accessAuditEvent.create = async ({ data: event }) => {
    events.push(event);
    return {};
  };
  const controller = new AdminProfilesController(data, provisioning());
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

test("[auth-admin] el login y callback bajo /admin se entregan a Auth0", async () => {
  const [callback, page, proxy, config, nginx] = await Promise.all([
    readWorkspaceFile("apps/admin-web/app/auth/callback/route.ts"),
    readWorkspaceFile("apps/admin-web/app/page.tsx"),
    readWorkspaceFile("apps/admin-web/proxy.ts"),
    readWorkspaceFile("apps/admin-web/next.config.ts"),
    readWorkspaceFile("infra/nginx/nginx.conf"),
  ]);

  assert.match(callback, /auth0\.middleware\(request\)/);
  assert.match(page, /href="\/admin\/login"/);
  assert.match(proxy, /auth0\.middleware\(request\)/);
  assert.match(config, /basePath: "\/admin"/);
  assert.doesNotMatch(nginx, /location = \/login/);
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
      upsert: async ({ create }) => ({ id: "target", status: "ACTIVE", ...create }),
      update: async () => ({ id: "target", ...target }),
    },
    accessAuditEvent: { create: async () => ({}) },
  };
}

function provisioning() {
  return {
    provisionInternalAccount: async () => "auth0|synthetic",
    requestPasswordReset: async () => {},
  };
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}

function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
