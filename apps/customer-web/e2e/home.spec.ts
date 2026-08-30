import { test, expect } from "@playwright/test";

test("página principal carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /PIGAR/i })).toBeVisible();
  await expect(page.locator(".product-shell--customer")).toBeVisible();
  await expect(page.locator(".customer-hero")).toBeVisible();
  await expect(page.locator(".request-form")).toBeVisible();
  await expect(page.locator(".request-form > button")).toHaveCSS("min-height", "48px");
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

test("CLIENT ve pagos pendiente y rechazado y puede reintentar sin adelantar la orden", async ({
  page,
}) => {
  const requests = [
    customerPaymentRequest("00000000-0000-4000-8000-000000000601", "PENDIENTE_PAGO", 5),
    customerPaymentRequest("00000000-0000-4000-8000-000000000602", "PENDIENTE_PAGO", 6),
  ];
  await page.route("**/api/requests", (route) => route.fulfill({ json: { items: requests } }));
  await page.route("**/api/requests/*/billing", (route) => {
    const rejected = route.request().url().includes("000000000602");
    return route.fulfill({ json: billingView(rejected ? "RECHAZADO" : "PENDIENTE") });
  });
  await page.route("**/api/requests/*/payment-attempts", (route) =>
    route.fulfill({ json: { state: "CREATED" } }),
  );
  await page.goto("/");
  await expect(page.getByText("Estado del pago: PENDIENTE")).toBeVisible();
  await expect(page.getByText("Estado del pago: RECHAZADO")).toBeVisible();
  await page.getByRole("button", { name: "Reintentar pago" }).click();
  await expect(
    page.getByText("Estamos verificando el pago. No se generó un enlace seguro disponible."),
  ).toBeVisible();
  await expect(page.getByText(/PENDIENTE_PAGO/).first()).toBeVisible();
});

test("CLIENT conforma sólo después de un pago aprobado", async ({ page }) => {
  const request = customerPaymentRequest(
    "00000000-0000-4000-8000-000000000603",
    "PENDIENTE_CONFORMIDAD",
    7,
  );
  let conformed = false;
  await page.route("**/api/requests", (route) =>
    route.fulfill({
      json: {
        items: [
          conformed
            ? { ...request, order: { ...request.order, state: "CERRADA", version: 8 } }
            : request,
        ],
      },
    }),
  );
  await page.route("**/api/requests/*/billing", (route) =>
    route.fulfill({ json: billingView("APROBADO") }),
  );
  await page.route("**/api/requests/*/conformity", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      expectedOrderVersion: 7,
      textVersion: "v1",
      accepted: true,
    });
    conformed = true;
    await route.fulfill({ json: { orderState: "CERRADA", textVersion: "v1" } });
  });
  await page.goto("/");
  await expect(page.getByText("Estado del pago: APROBADO")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar conformidad" }).click();
  await expect(page.getByText(/CERRADA/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar conformidad" })).toHaveCount(0);
});

function customerPaymentRequest(id: string, state: string, version: number) {
  return {
    id,
    createdAt: "2026-08-30T12:00:00.000Z",
    completeness: "READY_FOR_OPERATION",
    offer: { category: "Visita Simple", currency: "ARS", price: "50000.00" },
    order: {
      state,
      version,
      updatedAt: "2026-08-30T12:05:00.000Z",
      technician: null,
      history: [],
    },
  };
}

function billingView(status: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CANCELADO") {
  return {
    resolution: { summary: "Trabajo sintético finalizado" },
    charge: { money: { currency: "ARS", amount: "50000.00" } },
    payment: {
      status,
      canStartOrResume: status === "RECHAZADO" || status === "CANCELADO",
    },
  };
}
