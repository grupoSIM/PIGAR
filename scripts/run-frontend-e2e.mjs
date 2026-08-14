import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

for (const [workspace, environment] of [
  ["@pigar/customer-web", { PIGAR_E2E_PORT: "3100" }],
  ["@pigar/admin-web", {}],
]) {
  const result = spawnSync(pnpm, ["--filter", workspace, "run", "test:e2e"], {
    stdio: "inherit",
    env: { ...process.env, ...environment },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
