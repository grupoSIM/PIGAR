import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { IdentityGuard } from "../apps/api/dist/identity/identity.guard.js";

test("[auth-token-validation] rechaza token ausente o malformado sin consultar perfiles", async () => {
  const database = {
    profile: {
      findUnique: async () => {
        throw new Error("no debe consultar");
      },
    },
  };
  const guard = new IdentityGuard(database);
  for (const authorization of [undefined, "Bearer not-a-jwt", "Basic synthetic"]) {
    await assert.rejects(() => guard.canActivate(context(authorization)), hasStatus(401));
  }
});

test("[auth-token-validation] valida firma, issuer, audiencia y expiración antes de consultar perfiles", async () => {
  const verifier = await syntheticVerifier();
  for (const token of [
    await verifier.token({ audience: "https://wrong-audience.test" }),
    await verifier.token({ expiresIn: "0s" }),
    await verifier.token({ issuer: "https://wrong-issuer.test/" }),
    await verifier.token({ kid: "synthetic-unknown" }),
  ]) {
    const database = {
      profile: {
        findUnique: async () => {
          throw new Error("no debe consultar");
        },
      },
    };
    await assert.rejects(
      () => verifier.guard(database).canActivate(context(`Bearer ${token}`)),
      hasStatus(401),
    );
  }
});

test("[inactive-and-worker-access] deniega perfiles inactivos y roles fuera de PIGAR", async () => {
  const verifier = await syntheticVerifier();
  for (const profile of [
    { id: "inactive", identitySubject: "auth0|synthetic", role: "CLIENT", status: "INACTIVE" },
    { id: "worker", identitySubject: "auth0|synthetic", role: "WORKER", status: "ACTIVE" },
  ]) {
    const database = { profile: { findUnique: async () => profile } };
    const token = await verifier.token();
    await assert.rejects(
      () => verifier.guard(database).canActivate(context(`Bearer ${token}`)),
      hasStatus(403),
    );
  }
});

async function syntheticVerifier() {
  const issuer = "https://issuer.synthetic.test/";
  const audience = "https://api.synthetic.test";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwks = async (header) => {
    if (header.kid !== "synthetic-known" || header.alg !== "RS256") throw new Error("UNKNOWN_KEY");
    return publicKey;
  };

  return {
    guard(database) {
      const guard = new IdentityGuard(database);
      guard.configuration = {
        auth0: { audience, issuer },
        environment: "test",
        host: "127.0.0.1",
        port: 3000,
      };
      guard.jwks = jwks;
      return guard;
    },
    async token({
      audience: tokenAudience = audience,
      expiresIn = "5m",
      issuer: tokenIssuer = issuer,
      kid = "synthetic-known",
    } = {}) {
      const issuedAt = Math.floor(Date.now() / 1000);
      const payload = encode({
        aud: tokenAudience,
        exp: expiresAt(expiresIn, issuedAt),
        iat: issuedAt,
        iss: tokenIssuer,
        sub: "auth0|synthetic",
      });
      const protectedHeader = encode({ alg: "RS256", kid, typ: "JWT" });
      const signingInput = `${protectedHeader}.${payload}`;
      return `${signingInput}.${sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url")}`;
    },
  };
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function expiresAt(value, issuedAt) {
  if (value === "0s") return issuedAt;
  if (value === "5m") return issuedAt + 300;
  throw new Error("Duración sintética desconocida");
}

function context(authorization) {
  return { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) };
}

function hasStatus(status) {
  return (error) => typeof error?.getStatus === "function" && error.getStatus() === status;
}
