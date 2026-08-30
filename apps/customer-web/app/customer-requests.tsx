"use client";

import { useEffect, useState } from "react";

type BillingView = {
  resolution: { summary: string };
  charge: { money: { currency: string; amount: string } };
  payment: {
    status: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CANCELADO";
    canStartOrResume: boolean;
  };
};

type CustomerRequest = {
  id: string;
  createdAt: string;
  completeness: string;
  offer: { category: string; currency: string; price: string };
  order: {
    state: string;
    version: number;
    updatedAt: string;
    technician: { fullName: string } | null;
    history: Array<{ action: string; toState: string; occurredAt: string }>;
  } | null;
  billing?: BillingView;
};

export function CustomerRequests() {
  const [items, setItems] = useState<CustomerRequest[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);

  async function pay(item: CustomerRequest) {
    if (!item.order) return;
    setMessage("Estamos preparando el checkout seguro…");
    const response = await fetch(`/api/requests/${item.id}/payment-attempts`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ expectedOrderVersion: item.order.version }),
    });
    if (!response.ok)
      return setMessage(
        "No pudimos iniciar el pago. Verificaremos el estado antes de permitir otro intento.",
      );
    const payload = (await response.json()) as { checkoutUrl?: string };
    if (!payload.checkoutUrl?.startsWith("https://"))
      return setMessage("Estamos verificando el pago. No se generó un enlace seguro disponible.");
    window.location.assign(payload.checkoutUrl);
  }
  async function conform(item: CustomerRequest) {
    if (!item.order) return;
    const response = await fetch(`/api/requests/${item.id}/conformity`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        expectedOrderVersion: item.order.version,
        textVersion: "v1",
        accepted: true,
      }),
    });
    if (!response.ok)
      return setMessage(
        "Todavía no podemos registrar tu conformidad. Actualizá el estado del pago.",
      );
    setMessage("Tu conformidad fue registrada.");
    await load();
  }

  async function load() {
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/requests");
      if (response.status === 401) throw new Error("auth");
      if (!response.ok) throw new Error("load");
      const listed = ((await response.json()) as { items?: CustomerRequest[] }).items ?? [];
      const hydrated = await Promise.all(
        listed.map(async (item) => {
          if (
            !item.order ||
            !["PENDIENTE_PAGO", "PENDIENTE_CONFORMIDAD", "CERRADA"].includes(item.order.state)
          )
            return item;
          const billingResponse = await fetch(`/api/requests/${item.id}/billing`);
          if (!billingResponse.ok) return item;
          return { ...item, billing: (await billingResponse.json()) as BillingView };
        }),
      );
      setItems(hydrated);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "auth"
          ? "No pudimos autorizar la consulta de tus solicitudes. Cerrá sesión e ingresá nuevamente."
          : "No pudimos cargar tus solicitudes. Intentá nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="customer-requests" aria-label="Mis solicitudes">
      <div className="customer-requests__header">
        <h2>Mis solicitudes</h2>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      {message && (
        <p className="customer-requests__message" role="status">
          {message}{" "}
          {message.includes("autorizar") && (
            <a href="/auth/logout?returnTo=/">Ingresar nuevamente</a>
          )}
        </p>
      )}
      {loading && (
        <p className="customer-requests__state" role="status">
          Cargando tus solicitudes…
        </p>
      )}
      {!loading && !message && items.length === 0 && (
        <p className="customer-requests__state">
          Aún no registraste solicitudes. Cuando crees una, vas a verla acá.
        </p>
      )}
      <ul className="customer-requests__list">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.offer.category}</strong> — {item.offer.currency} {item.offer.price}
            <p>
              Registrada el {new Date(item.createdAt).toLocaleString("es-AR")}.{" "}
              {item.order?.state ?? "Pendiente de asignación"}
            </p>
            {item.order?.technician && <p>Técnico asignado: {item.order.technician.fullName}</p>}
            {item.billing && (
              <div>
                <p>Resolución: {item.billing.resolution.summary}</p>
                <p>
                  Cargo: {item.billing.charge.money.currency} {item.billing.charge.money.amount}
                </p>
                <p>Estado del pago: {item.billing.payment.status}</p>
              </div>
            )}
            {item.order && (
              <ul aria-label="Historial de la orden">
                {item.order.history.map((entry) => (
                  <li key={`${entry.action}-${entry.occurredAt}`}>
                    {entry.toState} — {new Date(entry.occurredAt).toLocaleString("es-AR")}
                  </li>
                ))}
              </ul>
            )}
            {item.order?.state === "PENDIENTE_PAGO" && (
              <button type="button" onClick={() => void pay(item)}>
                {item.billing?.payment.status === "RECHAZADO" ||
                item.billing?.payment.status === "CANCELADO"
                  ? "Reintentar pago"
                  : "Pagar o retomar"}
              </button>
            )}
            {item.order?.state === "PENDIENTE_CONFORMIDAD" && (
              <button type="button" onClick={() => void conform(item)}>
                Confirmar conformidad
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
