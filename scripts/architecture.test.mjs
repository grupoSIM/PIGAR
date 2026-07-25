import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domainRoot = path.join(root, "packages", "domain");
const forbiddenDependencies = ["next", "@nestjs/core", "fastify", "@prisma/client"];

test("el dominio no depende de frameworks ni proveedores", async () => {
  const manifest = JSON.parse(await readFile(path.join(domainRoot, "package.json"), "utf8"));
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };

  for (const dependency of forbiddenDependencies) {
    assert.equal(dependencies[dependency], undefined, `dependencia prohibida: ${dependency}`);
  }
});
