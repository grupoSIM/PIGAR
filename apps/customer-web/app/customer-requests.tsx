"use client";

import { useEffect, useState } from "react";

type CustomerRequest = {
  id: string;
  createdAt: string;
  completeness: string;
  offer: { category: string; currency: string; price: string };
  order: {
    state: string;
    updatedAt: string;
    technician: { fullName: string } | null;
    history: Array<{ action: string; toState: string; occurredAt: string }>;
  } | null;
};

export function CustomerRequests() {
  const [items, setItems] = useState<CustomerRequest[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/requests");
      if (response.status === 401) throw new Error("auth");
      if (!response.ok) throw new Error("load");
      setItems(((await response.json()) as { items?: CustomerRequest[] }).items ?? []);
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
            {item.order && (
              <ul aria-label="Historial de la orden">
                {item.order.history.map((entry) => (
                  <li key={`${entry.action}-${entry.occurredAt}`}>
                    {entry.toState} — {new Date(entry.occurredAt).toLocaleString("es-AR")}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
