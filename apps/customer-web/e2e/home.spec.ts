import { test, expect } from "@playwright/test";

test("página principal carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /PIGAR/i })).toBeVisible();
});

test("CLIENT consulta estado e historial seguro de su orden", async ({ page }) => {
  await page.route("**/api/offers", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            category: {
              id: "00000000-0000-4000-8000-000000000101",
              name: "Visita Simple",
              scope: "Alcance sintético",
            },
            currency: "ARS",
            price: "50000.00",
          },
        ],
      },
    }),
  );
  await page.route("**/api/requests", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              items: [
                {
                  id: "00000000-0000-4000-8000-000000000302",
                  createdAt: "2026-08-14T11:00:00.000Z",
                  completeness: "READY_FOR_OPERATION",
                  offer: { category: "Visita Simple", currency: "ARS", price: "50000.00" },
                  order: {
                    state: "TECNICO_ASIGNADO",
                    updatedAt: "2026-08-14T11:05:00.000Z",
                    technician: { fullName: "Técnico sintético" },
                    history: [
                      {
                        action: "ASSIGN_TECHNICIAN",
                        toState: "TECNICO_ASIGNADO",
                        occurredAt: "2026-08-14T11:05:00.000Z",
                      },
                    ],
                  },
                },
              ],
            }
          : { id: "00000000-0000-4000-8000-000000000301" },
    }),
  );
  await page.route("**/api/requests/*/order", (route) =>
    route.fulfill({
      json: {
        state: "EN_CAMINO",
        technician: { fullName: "Técnico sintético" },
        history: [
          {
            action: "ASSIGN_TECHNICIAN",
            toState: "TECNICO_ASIGNADO",
            occurredAt: "2026-08-14T12:00:00.000Z",
          },
          { action: "MARK_EN_ROUTE", toState: "EN_CAMINO", occurredAt: "2026-08-14T12:05:00.000Z" },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mis solicitudes" })).toBeVisible();
  await expect(page.getByText(/Técnico asignado: Técnico sintético/)).toBeVisible();
  await page.getByLabel("Oferta vigente").selectOption("00000000-0000-4000-8000-000000000101");
  await page.getByLabel("Descripción del problema").fill("Pérdida sintética");
  await page.getByLabel("Calle", { exact: true }).fill("Calle sintética");
  await page.getByLabel("Número").fill("123");
  await page.getByRole("button", { name: "Crear solicitud" }).click();
  await page.getByRole("button", { name: "Consultar estado de la orden" }).click();
  await expect(page.getByText(/EN_CAMINO — técnico asignado: Técnico sintético/)).toBeVisible();
  await expect(page.getByText(/TECNICO_ASIGNADO/).first()).toBeVisible();
  await expect(page.getByText(/5555|motivo interno/)).toHaveCount(0);
});

test("CLIENT puede reiniciar el acceso si la API rechaza su autorización", async ({ page }) => {
  await page.route("**/api/requests", (route) => route.fulfill({ status: 401 }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Cerrar sesión" })).toBeVisible();
  await expect(page.getByText(/No pudimos autorizar/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar nuevamente" })).toHaveAttribute(
    "href",
    "/auth/logout?returnTo=/",
  );
});
