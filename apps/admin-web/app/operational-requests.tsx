"use client";

import { useEffect, useState } from "react";

type RequestItem = {
  id: string;
  description: string;
  completeness: string;
  offer: { category: string; currency: string; price: string; version: number };
  address: {
    street: string;
    number: string;
    neighborhood?: string;
    crossStreetOne?: string;
    crossStreetTwo?: string;
    normalizedAddress?: string;
    latitude?: string;
    longitude?: string;
  } | null;
  media: Array<{ id: string; kind: string; mime: string }>;
};

type Technician = { id: string; fullName: string; phone: string | null; status: string };
type Order = {
  id: string;
  requestId: string;
  state: string;
  version: number;
  technician: Technician | null;
};

export function OperationalRequests({
  mediaDeliveryOrigin = "",
}: {
  mediaDeliveryOrigin?: string;
}) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [actionMessage, setActionMessage] = useState<string>();

  useEffect(() => {
    fetch("/admin/api/requests")
      .then(async (res) => {
        if (res.status === 401) {
          const problem = (await res.json().catch(() => ({}))) as { code?: string };
          setError(authenticationMessage(problem.code));
          return;
        }
        if (!res.ok) throw new Error("list-failed");
        const data = (await res.json()) as { items?: RequestItem[] };
        setItems(data.items ?? []);
      })
      .catch(() => setError("Error al cargar la bandeja de solicitudes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch("/admin/api/operations/technicians").then((res) => res.json()),
      fetch("/admin/api/operations/orders").then((res) => res.json()),
    ]).then(([technicianData, orderData]) => {
      setTechnicians((technicianData as { items?: Technician[] }).items ?? []);
      setOrders((orderData as { items?: Order[] }).items ?? []);
    });
  }, []);

  async function assign(requestId: string, technicianId: string) {
    const response = await fetch(`/admin/api/operations/requests/${requestId}/assignment`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ technicianId }),
    });
    if (!response.ok) {
      setActionMessage("No se pudo asignar el técnico. Verificá que la solicitud esté operable.");
      return;
    }
    const order = (await response.json()) as Order;
    setOrders((current) => [...current.filter((item) => item.requestId !== requestId), order]);
    setActionMessage("Técnico asignado. La orden quedó registrada.");
  }

  async function transition(order: Order, action: string, reason?: string, technicianId?: string) {
    const response = await fetch(`/admin/api/operations/orders/${order.id}/transitions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        expectedVersion: order.version,
        ...(reason ? { reason } : {}),
        ...(technicianId ? { technicianId } : {}),
      }),
    });
    if (!response.ok) return setActionMessage("No se pudo actualizar el hito de la orden.");
    const updated = (await response.json()) as Order;
    setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setActionMessage("Hito operativo actualizado.");
  }

  async function createTechnician(formData: FormData) {
    const response = await fetch("/admin/api/operations/technicians", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        status: "ACTIVE",
      }),
    });
    if (!response.ok)
      return setActionMessage("Sólo ADMIN puede registrar técnicos con teléfono válido.");
    const technician = (await response.json()) as Technician;
    setTechnicians((current) => [technician, ...current]);
    setActionMessage("Técnico registrado para asignación.");
  }

  async function setTechnicianStatus(technician: Technician) {
    const response = await fetch(`/admin/api/operations/technicians/${technician.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: technician.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    if (!response.ok) return setActionMessage("No se pudo actualizar el estado del técnico.");
    const updated = (await response.json()) as Technician;
    setTechnicians((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setActionMessage("Estado del técnico actualizado.");
  }

  async function editTechnician(technician: Technician) {
    const fullName = window.prompt("Nombre completo", technician.fullName);
    const phone = window.prompt("Teléfono operativo", technician.phone ?? "");
    if (!fullName || !phone) return;
    const response = await fetch(`/admin/api/operations/technicians/${technician.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName, phone }),
    });
    if (!response.ok) return setActionMessage("No se pudieron editar los datos del técnico.");
    const updated = (await response.json()) as Technician;
    setTechnicians((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setActionMessage("Datos del técnico actualizados.");
  }

  if (loading) return <p role="status">Cargando bandeja de solicitudes…</p>;
  if (error)
    return (
      <p className="admin-requests__error" role="status">
        {error}
      </p>
    );

  return (
    <div className="admin-requests">
      <h2>Solicitudes registradas ({items.length})</h2>
      <form action={createTechnician} className="admin-requests__technician">
        <h3>Registrar técnico</h3>
        <label>
          Nombre completo
          <input name="fullName" required maxLength={160} />
        </label>
        <label>
          Teléfono operativo
          <input name="phone" required maxLength={32} />
        </label>
        <button type="submit">Agregar técnico</button>
      </form>
      <section id="technicians" aria-label="Técnicos internos">
        <h3>Técnicos internos</h3>
        {technicians.length === 0 ? (
          <p>No hay técnicos registrados.</p>
        ) : (
          <ul>
            {technicians.map((technician) => (
              <li key={technician.id}>
                {technician.fullName} — {technician.phone} — {technician.status}
                <button type="button" onClick={() => void setTechnicianStatus(technician)}>
                  {technician.status === "ACTIVE" ? "Desactivar" : "Activar"}
                </button>
                <button type="button" onClick={() => void editTechnician(technician)}>
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {items.length === 0 ? (
        <p>No hay solicitudes registradas en la bandeja.</p>
      ) : (
        <ul id="requests" className="admin-requests__list">
          {items.map((item) => (
            <li key={item.id} className="admin-requests__card">
              <header className="admin-requests__card-header">
                <strong>{item.offer.category}</strong> ({item.offer.currency} {item.offer.price})
                <span
                  className={`admin-requests__badge admin-requests__badge--${item.completeness.toLowerCase()}`}
                >
                  {item.completeness === "READY_FOR_OPERATION"
                    ? "Operable"
                    : "Pendiente de multimedia"}
                </span>
              </header>

              <div className="admin-requests__card-body">
                <p>
                  <strong>Descripción:</strong> {item.description}
                </p>
                {item.address && (
                  <p>
                    <strong>Domicilio:</strong> {item.address.street} {item.address.number}
                    {item.address.neighborhood ? `, ${item.address.neighborhood}` : ""}
                    {item.address.normalizedAddress ? ` (${item.address.normalizedAddress})` : ""}
                  </p>
                )}

                {item.media.length > 0 ? (
                  <div className="admin-requests__media">
                    <strong>Adjuntos ({item.media.length}):</strong>
                    <ul>
                      {item.media.map((m) => (
                        <li key={m.id}>
                          <a
                            href={`${mediaDeliveryOrigin}/admin/api/requests/${item.id}/media/${m.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {m.kind} ({m.mime})
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>
                    <em>Sin archivos multimedia adjuntos.</em>
                  </p>
                )}
                {item.completeness === "READY_FOR_OPERATION" &&
                  !orders.some((order) => order.requestId === item.id) && (
                    <label>
                      Asignar técnico
                      <select
                        defaultValue=""
                        onChange={(event) =>
                          event.target.value && void assign(item.id, event.target.value)
                        }
                      >
                        <option value="">Seleccioná un técnico activo</option>
                        {technicians
                          .filter((technician) => technician.status === "ACTIVE")
                          .map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.fullName}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                {orders
                  .filter((order) => order.requestId === item.id)
                  .map((order) => (
                    <div key={order.id}>
                      <p>
                        <strong>Orden:</strong> {order.state} — {order.technician?.fullName}
                      </p>
                      {order.state === "TECNICO_ASIGNADO" && (
                        <button
                          type="button"
                          onClick={() => void transition(order, "MARK_EN_ROUTE")}
                        >
                          Marcar en camino
                        </button>
                      )}
                      {(order.state === "TECNICO_ASIGNADO" || order.state === "EN_CAMINO") && (
                        <button
                          type="button"
                          onClick={() => void transition(order, "START_SERVICE")}
                        >
                          Iniciar atención
                        </button>
                      )}
                      {order.state === "EN_ATENCION" && (
                        <button type="button" onClick={() => void transition(order, "FINISH_WORK")}>
                          Finalizar trabajo
                        </button>
                      )}
                      {order.state === "TECNICO_ASIGNADO" && (
                        <label>
                          Reasignar técnico
                          <select
                            defaultValue=""
                            onChange={(event) => {
                              const technicianId = event.target.value;
                              const reason = window.prompt("Motivo interno de reasignación");
                              if (technicianId && reason)
                                void transition(order, "REASSIGN_TECHNICIAN", reason, technicianId);
                            }}
                          >
                            <option value="">Seleccioná técnico activo</option>
                            {technicians
                              .filter(
                                (technician) =>
                                  technician.status === "ACTIVE" &&
                                  technician.id !== order.technician?.id,
                              )
                              .map((technician) => (
                                <option key={technician.id} value={technician.id}>
                                  {technician.fullName}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {!["EN_ATENCION", "TRABAJO_FINALIZADO", "CANCELADA"].includes(
                        order.state,
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt("Motivo interno de cancelación");
                            if (reason) void transition(order, "CANCEL", reason);
                          }}
                        >
                          Cancelar orden
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {actionMessage && (
        <p className="admin-requests__notice" role="status">
          {actionMessage}
        </p>
      )}
    </div>
  );
}

function authenticationMessage(code: string | undefined): string {
  if (code === "AUTH_ACCESS_TOKEN_UNAVAILABLE")
    return "Tu sesión está activa, pero no se pudo obtener la autorización para la bandeja.";
  if (code === "AUTH_API_TOKEN_REJECTED")
    return "La autorización de tu sesión fue rechazada por la bandeja. Volvé a iniciar sesión.";
  return "Iniciá sesión como ADMIN o DISPATCHER para acceder a la bandeja.";
}
