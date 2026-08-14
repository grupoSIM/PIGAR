import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readWorkspaceFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("los shells declaran idioma, región principal y foco visible", async () => {
  const [customerLayout, adminLayout, customerCss, adminCss, ui] = await Promise.all([
    readWorkspaceFile("apps/customer-web/app/layout.tsx"),
    readWorkspaceFile("apps/admin-web/app/layout.tsx"),
    readWorkspaceFile("apps/customer-web/app/styles.css"),
    readWorkspaceFile("apps/admin-web/app/styles.css"),
    readWorkspaceFile("packages/ui/src/index.tsx"),
  ]);

  assert.match(customerLayout, /<html lang="es-AR">/);
  assert.match(adminLayout, /<html lang="es-AR">/);
  assert.match(customerCss, /:focus-visible/);
  assert.match(adminCss, /:focus-visible/);
  assert.match(ui, /<main/);
  assert.match(ui, /aria-labelledby="page-title"/);
  assert.match(ui, /<h1 id="page-title">/);
  assert.match(customerCss, /@font-face/);
  assert.match(adminCss, /@font-face/);
  assert.match(customerCss, /min-height: 48px/);
  assert.match(ui, /product-shell__sidebar/);
  assert.match(ui, /Abrir navegación/);
  assert.match(ui, /aria-controls="admin-navigation"/);
  assert.match(adminCss, /product-shell__nav--open/);
});

test("cada shell comunica PIGAR y preserva el alcance del MVP", async () => {
  const [customerPage, adminPage] = await Promise.all([
    readWorkspaceFile("apps/customer-web/app/page.tsx"),
    readWorkspaceFile("apps/admin-web/app/page.tsx"),
  ]);

  assert.match(customerPage, /audience="clientes"/);
  assert.match(customerPage, /PIGAR/);
  assert.match(adminPage, /audience="administración"/);
  assert.match(adminPage, /PIGAR/);
  assert.doesNotMatch(customerPage, /ubicación del técnico|tracking|mapa en tiempo real/i);
  assert.doesNotMatch(adminPage, /mapa de calor|asignación automática|técnicos activos en ruta/i);
});
