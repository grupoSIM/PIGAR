import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documentPath = path.join(root, "docs", "runbooks", "capacity-and-recovery.md");
const document = await readFile(documentPath, "utf8");
const review = await readFile(
  path.join(root, "specs", "features", "feat-001", "review.md"),
  "utf8",
);

for (const heading of [
  "## Línea base verificada",
  "## Cuotas y costes de proveedores",
  "## Cifrado, despliegue y recuperación",
  "## Bloqueantes antes de producción",
  "## Fuentes oficiales consultadas",
]) {
  assert.ok(document.includes(heading), `Falta la sección: ${heading}`);
}

for (const source of [
  "hostinger.com",
  "auth0.com",
  "developers.google.com",
  "mercadopago.com.ar",
]) {
  assert.ok(document.includes(source), `Falta fuente oficial: ${source}`);
}

assert.match(document, /Fecha de revisión: 2026-07-25/);
assert.match(document, /2 vCPU, 8 GB RAM, 100 GB NVMe y 8 TB/);
assert.match(document, /backup externo cifrado/i);
assert.match(document, /restaurar una copia cifrada/i);
assert.match(review, /revisión independiente aprobada por usuario/i);
assert.match(review, /AC-011 permanece parcial/i);
