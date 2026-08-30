import { test, expect } from "@playwright/test";

test("página principal de admin carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /Bandeja operativa/i })).toBeVisible();
  await expect(page.locator(".product-shell--admin")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación administrativa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bandeja operativa" })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("navigation", { name: "Navegación administrativa" })).toBeHidden();
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await expect(page.getByRole("link", { name: "Técnicos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Solicitudes" })).toBeVisible();
});

test("ADMIN asigna y actualiza un hito de una orden", async ({ page }) => {
  const request = {
    id: "00000000-0000-4000-8000-000000000101",
    description: "Pérdida sintética",
    completeness: "READY_FOR_OPERATION",
    offer: { category: "Visita Simple", currency: "ARS", price: "50000.00", version: 1 },
    address: null,
    media: [],
  };
  const technician = {
    id: "00000000-0000-4000-8000-000000000201",
    fullName: "Técnico sintético",
    phone: "+54 11 5555 0000",
    status: "ACTIVE",
  };
  await page.route("**/admin/api/requests", (route) =>
    route.fulfill({ json: { items: [request] } }),
  );
  await page.route("**/admin/api/operations/technicians", (route) =>
    route.fulfill({ json: { items: [technician] } }),
  );
  await page.route("**/admin/api/operations/orders", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/admin/api/operations/requests/*/assignment", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000301",
        requestId: request.id,
        state: "TECNICO_ASIGNADO",
        version: 1,
        technician,
      },
    }),
  );
  await page.route("**/admin/api/operations/orders/*/transitions", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000301",
        requestId: request.id,
        state: "EN_CAMINO",
        version: 2,
        technician,
      },
    }),
  );
  await page.goto("/admin");
  await page.getByLabel("Asignar técnico").selectOption(technician.id);
  await expect(page.getByText("Técnico asignado. La orden quedó registrada.")).toBeVisible();
  await page.getByRole("button", { name: "Marcar en camino" }).click();
  await expect(page.getByText(/Orden: EN_CAMINO/)).toBeVisible();
});

test("ADMIN abre los adjuntos mediante la entrega privada", async ({ page }) => {
  const mediaId = "00000000-0000-4000-8000-000000000402";
  const request = {
    id: "00000000-0000-4000-8000-000000000401",
    description: "Adjunto sintético",
    completeness: "READY_FOR_OPERATION",
    offer: { category: "Visita Simple", currency: "ARS", price: "50000.00", version: 1 },
    address: null,
    media: [
      {
        id: mediaId,
        kind: "IMAGE",
        mime: "image/png",
      },
    ],
  };
  await page.route("**/admin/api/requests", (route) =>
    route.fulfill({ json: { items: [request] } }),
  );
  await page.route("**/admin/api/operations/technicians", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/admin/api/operations/orders", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "IMAGE (image/png)" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8088/admin/api/requests/${request.id}/media/${mediaId}`,
  );
});

test("ADMIN registra la resolución y crea el cargo congelado", async ({ page }) => {
  const request = {
    id: "00000000-0000-4000-8000-000000000501",
    description: "Resolución sintética",
    completeness: "READY_FOR_OPERATION",
    offer: { category: "Visita Simple", currency: "ARS", price: "50000.00", version: 1 },
    address: null,
    media: [],
  };
  const order = {
    id: "00000000-0000-4000-8000-000000000502",
    requestId: request.id,
    state: "TRABAJO_FINALIZADO",
    version: 4,
    technician: { fullName: "Técnico sintético" },
  };
  let resolutionBody: Record<string, unknown> | undefined;
  await page.route("**/admin/api/requests", (route) =>
    route.fulfill({ json: { items: [request] } }),
  );
  await page.route("**/admin/api/operations/technicians", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/admin/api/operations/orders", (route) =>
    route.fulfill({ json: { items: [order] } }),
  );
  await page.route("**/admin/api/operations/orders/*/resolution", async (route) => {
    resolutionBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { ...order, state: "PENDIENTE_PAGO", version: 5 } });
  });
  page.on("dialog", (dialog) => dialog.accept("Trabajo sintético finalizado"));
  await page.goto("/admin");
  await page.getByRole("button", { name: "Registrar resolución y cargo" }).click();
  await expect(
    page.getByText("Resolución registrada. El cliente puede iniciar el pago."),
  ).toBeVisible();
  await expect(page.getByText(/Orden: PENDIENTE_PAGO/)).toBeVisible();
  expect(resolutionBody).toEqual({
    outcome: "RESUELTO_EN_VISITA",
    summary: "Trabajo sintético finalizado",
    expectedOrderVersion: 4,
  });
});
