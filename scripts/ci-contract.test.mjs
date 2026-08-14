import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = path.join(root, "node_modules");
const prettier = path.join(nodeModules, "prettier", "bin", "prettier.cjs");
const eslint = path.join(nodeModules, "eslint", "bin", "eslint.js");
const tsc = path.join(nodeModules, "typescript", "bin", "tsc");

function mustFail(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  assert.notEqual(result.status, 0, `${command} ${arguments_.join(" ")} debe bloquear CI`);
}

test("[ci-contract] el workflow ejecuta instalación reproducible y todas las categorías bloqueantes", async () => {
  const workflow = await readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8");

  for (const command of [
    "pnpm install --frozen-lockfile --ignore-scripts",
    "pnpm format:check",
    "pnpm lint",
    "pnpm typecheck",
    "pnpm test:unit",
    "pnpm test:integration",
    "pnpm test:security",
    "pnpm test:e2e",
    "pnpm docs:check",
  ]) {
    assert.match(workflow, new RegExp(`- run: ${command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  }
  assert.match(workflow, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(workflow, /deploy|ssh|secret/i);
});

test("[ci-contract] las imágenes de staging sólo se publican por push a staging", async () => {
  const workflow = await readFile(
    path.join(root, ".github", "workflows", "publish-staging-images.yml"),
    "utf8",
  );

  assert.match(workflow, /push:\n\s+branches:\n\s+- staging/);
  assert.doesNotMatch(workflow, /workflow_run|workflow_dispatch|github\.ref_name == 'main'/);
  assert.doesNotMatch(workflow, /codex\/feat-002-auth0-staging/);
});

test("[ci-contract] regresiones controladas bloquean formato, lint, tipos y suites", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "pigar-ci-contract-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const unformatted = path.join(directory, "unformatted.js");
  const typeFailure = path.join(directory, "type-failure.ts");
  const lintFailure = path.join(root, "scripts", "ci-contract-regression.js");
  t.after(() => unlink(lintFailure).catch(() => undefined));
  await writeFile(unformatted, "const item={value:1}\n", "utf8");
  await writeFile(lintFailure, "missingIdentifier();\n", "utf8");
  await writeFile(typeFailure, "const item: string = 1;\n", "utf8");

  mustFail(process.execPath, [prettier, "--check", unformatted]);
  mustFail(process.execPath, [eslint, "--no-ignore", "--rule", "no-undef:error", lintFailure]);
  mustFail(process.execPath, [tsc, "--noEmit", "--strict", typeFailure]);
  for (const suite of ["unit", "integration", "security", "e2e"]) {
    mustFail(process.execPath, [
      "scripts/run-test-suite.mjs",
      suite,
      "--grep",
      "ci-contract-absent",
    ]);
  }
});
