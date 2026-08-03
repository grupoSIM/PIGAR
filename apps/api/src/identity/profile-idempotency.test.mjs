import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DatabaseService } from "../../dist/database.service.js";
import { IdentityGuard } from "../../dist/identity/identity.guard.js";

test("[profile-idempotency] altas concurrentes crean un único perfil local", async (t) => {
  const database = new DatabaseService();
  const subject = `auth0|profile-idempotency-${randomUUID()}`;
  t.after(async () => {
    await database.profile.deleteMany({ where: { identitySubject: subject } });
    await database.$disconnect();
  });

  const guard = new IdentityGuard(database);
  const profiles = await Promise.all(
    Array.from({ length: 16 }, () => guard.resolveProfile(subject, undefined)),
  );
  const stored = await database.profile.findMany({ where: { identitySubject: subject } });

  assert.equal(stored.length, 1);
  assert.equal(new Set(profiles.map((profile) => profile?.id)).size, 1);
  assert.equal(stored[0].role, "CLIENT");
  assert.equal(stored[0].status, "ACTIVE");
});
