import { test, expect } from "@playwright/test";

test("página principal carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /PIGAR/i })).toBeVisible();
  await expect(page.locator(".product-shell--customer")).toBeVisible();
  await expect(page.locator(".customer-hero")).toBeVisible();
  await page.goto("/requests/new");
  await expect(page.locator(".request-form")).toBeVisible();
  await expect(page.locator(".request-form > button")).toHaveCSS("min-height", "48px");
});

test("CLIENT navega por contextos separados de inicio, solicitudes y perfil", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Nueva solicitud" })).toHaveAttribute(
    "href",
    "/requests/new",
  );
  await expect(page.getByRole("link", { name: "Mis solicitudes", exact: true })).toHaveAttribute(
    "href",
    "/requests",
  );
  await expect(page.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/profile");
  await page.goto("/requests");
  await expect(page.locator(".request-form")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nueva solicitud" })).toHaveAttribute(
    "href",
    "/requests/new",
  );
  await page.getByRole("link", { name: "Nueva solicitud" }).click();
  await expect(page).toHaveURL(/\/requests\/new$/);
  await expect(page.getByRole("heading", { name: "Nueva solicitud" })).toBeVisible();
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
  await page.goto("/requests");
  await expect(
    page.locator("#requests").getByRole("heading", { name: "Mis solicitudes" }),
  ).toBeVisible();
  await expect(page.getByText(/Técnico asignado: Técnico sintético/)).toBeVisible();
  await page.getByRole("button", { name: /Visita Simple/ }).click();
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
  await page.goto("/requests");
  await expect(page.getByRole("link", { name: "Cerrar sesión" })).toBeVisible();
  await expect(page.getByText(/No pudimos autorizar/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar nuevamente" })).toHaveAttribute(
    "href",
    "/auth/logout?returnTo=/",
  );
});

test("CLIENT ve una bandeja accesible, marca leído y conserva degradación local", async ({
  page,
}) => {
  let read = false;
  await page.route("**/api/requests", (route) => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/notifications*", (route) => {
    const laterPage = route.request().url().includes("cursor=");
    return route.fulfill({
      json: {
        unreadCount: read ? 0 : 1,
        nextCursor: laterPage ? null : "synthetic-next-page",
        items: laterPage
          ? [
              {
                id: "00000000-0000-4000-8000-000000000903",
                title: "Pago confirmado",
                summary: "Tu pago fue confirmado.",
                createdAt: "2026-08-31T11:00:00.000Z",
                readAt: null,
                target: {
                  kind: "REQUEST_DETAIL",
                  requestId: "00000000-0000-4000-8000-000000000902",
                },
              },
            ]
          : [
              {
                id: "00000000-0000-4000-8000-000000000901",
                title: "Técnico en camino",
                summary: "La atención de tu solicitud está en camino.",
                createdAt: "2026-08-31T12:00:00.000Z",
                readAt: read ? "2026-08-31T12:01:00.000Z" : null,
                target: {
                  kind: "REQUEST_DETAIL",
                  requestId: "00000000-0000-4000-8000-000000000902",
                },
              },
            ],
      },
    });
  });
  await page.route("**/api/notifications/*/read", async (route) => {
    read = true;
    await route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000901",
        title: "Técnico en camino",
        summary: "La atención de tu solicitud está en camino.",
        createdAt: "2026-08-31T12:00:00.000Z",
        readAt: "2026-08-31T12:01:00.000Z",
        target: { kind: "REQUEST_DETAIL", requestId: "00000000-0000-4000-8000-000000000902" },
      },
    });
  });
  await page.route("**/api/requests/*/order", (route) =>
    route.fulfill({ json: { state: "EN_CAMINO" } }),
  );
  await page.goto("/requests");
  await expect(page.locator(".request-form")).toHaveCount(0);
  await page.getByRole("button", { name: /Notificaciones \(1 sin leer\)/ }).click();
  await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();
  await expect(page.locator(".customer-requests__header button")).toHaveClass(
    /customer-action--secondary/,
  );
  await expect(page.locator(".notifications__control").last()).toHaveClass(
    /customer-action--secondary/,
  );
  await expect(page.getByRole("button", { name: /Técnico en camino\. Sin leer/ })).toBeVisible();
  await page.getByRole("button", { name: "Cargar más" }).click();
  await expect(page.getByRole("button", { name: /Pago confirmado\. Sin leer/ })).toBeVisible();
  await page.getByRole("button", { name: /Técnico en camino\. Sin leer/ }).click();
  await expect.poll(() => read).toBe(true);
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
  await page.goto("/requests");
  await expect(page.getByText("Estado del pago: Pago pendiente")).toBeVisible();
  await expect(page.getByText("Estado del pago: Pago rechazado")).toBeVisible();
  await page.getByRole("button", { name: "Reintentar pago" }).click();
  await expect(
    page.getByText("Estamos verificando el pago. No se generó un enlace seguro disponible."),
  ).toBeVisible();
  await expect(page.getByText("Pago pendiente").first()).toBeVisible();
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
  await page.goto("/requests");
  await expect(page.getByText("Estado del pago: APROBADO")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar conformidad" }).click();
  await expect(page.getByText(/CERRADA/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar conformidad" })).toHaveCount(0);
});

test("CLIENT registra una calificación y una incidencia estructurada de una orden cerrada", async ({
  page,
}) => {
  const request = customerPaymentRequest("00000000-0000-4000-8000-000000000710", "CERRADA", 8);
  let incidentStatus: "ABIERTA" | "EN_TRIAGE" = "ABIERTA";
  await page.route("**/api/requests", (route) => route.fulfill({ json: { items: [request] } }));
  await page.route("**/api/requests/*/billing", (route) =>
    route.fulfill({ json: billingView("APROBADO") }),
  );
  await page.route("**/api/requests/*/rating", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 404 });
    expect(route.request().postDataJSON()).toMatchObject({ stars: 5, reason: "PUNTUALIDAD" });
    return route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000711" } });
  });
  await page.route("**/api/requests/*/incidents", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: {
          items:
            incidentStatus === "ABIERTA"
              ? []
              : [
                  {
                    id: "00000000-0000-4000-8000-000000000712",
                    type: "TRABAJO_INCOMPLETO",
                    status: incidentStatus,
                    version: incidentStatus === "EN_TRIAGE" ? 2 : 1,
                    createdAt: "2026-09-01T12:00:00.000Z",
                    history: [
                      {
                        sequence: 1,
                        action: "OPEN",
                        fromStatus: null,
                        toStatus: "ABIERTA",
                        actorRole: "CLIENT",
                        createdAt: "2026-09-01T12:00:00.000Z",
                      },
                      ...(incidentStatus === "EN_TRIAGE"
                        ? [
                            {
                              sequence: 2,
                              action: "START_TRIAGE",
                              fromStatus: "ABIERTA",
                              toStatus: "EN_TRIAGE",
                              actorRole: "ADMIN",
                              createdAt: "2026-09-01T12:05:00.000Z",
                            },
                          ]
                        : []),
                    ],
                  },
                ],
        },
      });
    }
    expect(route.request().postDataJSON()).toEqual({ type: "TRABAJO_INCOMPLETO" });
    incidentStatus = "ABIERTA";
    return route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000712",
        type: "TRABAJO_INCOMPLETO",
        status: "ABIERTA",
        version: 1,
        createdAt: "2026-09-01T12:00:00.000Z",
        history: [
          {
            sequence: 1,
            action: "OPEN",
            fromStatus: null,
            toStatus: "ABIERTA",
            actorRole: "CLIENT",
            createdAt: "2026-09-01T12:00:00.000Z",
          },
        ],
      },
    });
  });
  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "Postventa" })).toBeVisible();
  await page.getByLabel("Estrellas").focus();
  await expect(page.getByLabel("Estrellas")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Motivo")).toBeFocused();
  await page.getByLabel("Motivo").selectOption("PUNTUALIDAD");
  await page.getByRole("button", { name: "Registrar calificación" }).click();
  await expect(page.getByText(/no puede editarse/)).toBeVisible();
  await page.getByLabel("Tipo").selectOption("TRABAJO_INCOMPLETO");
  await page.getByRole("button", { name: "Abrir incidencia" }).click();
  await expect(page.getByText("Trabajo incompleto — Abierta")).toBeVisible();
  await expect(page.getByRole("list", { name: "Historial de incidencias" })).toContainText("2026");
  incidentStatus = "EN_TRIAGE";
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(page.getByText("Trabajo incompleto — En revisión")).toBeVisible();
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
