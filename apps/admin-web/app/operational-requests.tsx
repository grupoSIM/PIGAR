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
type AftercareIncident = {
  id: string;
  type: string;
  status: "ABIERTA" | "EN_TRIAGE" | "CERRADA";
  version: number;
  createdAt?: string;
  history: Array<{ action: string; toStatus: string; createdAt: string }>;
};
type AftercareSupport = {
  orderId: string;
  rating: { stars: number; reason: string; otherMessage?: string | null; createdAt: string } | null;
  incidents: AftercareIncident[];
};

const STATUS_LABELS: Record<string, string> = {
  ABIERTA: "Abierta",
  EN_TRIAGE: "En revisión",
  CERRADA: "Cerrada",
  TECNICO_ASIGNADO: "Técnico asignado",
  EN_CAMINO: "Técnico en camino",
  EN_ATENCION: "Atención en curso",
  TRABAJO_FINALIZADO: "Trabajo finalizado",
  PENDIENTE_PAGO: "Pago pendiente",
  PENDIENTE_CONFORMIDAD: "Pendiente de conformidad",
  CANCELADA: "Solicitud cancelada",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  RESULTADO_NO_ESPERADO: "Resultado no esperado",
  PROBLEMA_REAPARECIO: "El problema reapareció",
  TRABAJO_INCOMPLETO: "Trabajo incompleto",
  DANIO_REPORTADO: "Daño reportado",
  CONSULTA_SOBRE_COBRO: "Consulta sobre cobro",
};
function statusLabel(value: string): string {
  const label = STATUS_LABELS[value] ?? INCIDENT_TYPE_LABELS[value];
  if (label) return label;
  const humanized = value.replaceAll("_", " ").toLocaleLowerCase("es-AR");
  return humanized.charAt(0).toLocaleUpperCase("es-AR") + humanized.slice(1);
}

export function OperationalRequests({
  mediaDeliveryOrigin = "",
  view = "all",
}: {
  mediaDeliveryOrigin?: string;
  view?: "all" | "requests" | "technicians" | "incidents";
}) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [actionMessage, setActionMessage] = useState<string>();
  const [aftercareIncidents, setAftercareIncidents] = useState<AftercareIncident[]>([]);
  const [incidentError, setIncidentError] = useState<string>();
  const [incidentReload, setIncidentReload] = useState(0);
  const [transitioningIncident, setTransitioningIncident] = useState<string>();
  const [aftercareByOrderId, setAftercareByOrderId] = useState<Record<string, AftercareSupport>>(
    {},
  );
  const [aftercareLoading, setAftercareLoading] = useState<string>();
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTechnician, setFilterTechnician] = useState("");

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
    const params = new URLSearchParams();
    if (incidentStatusFilter) params.set("status", incidentStatusFilter);
    if (incidentTypeFilter) params.set("type", incidentTypeFilter);
    const query = params.toString();
    void fetch(`/admin/api/operations/incidents${query ? `?${query}` : ""}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("incident-list-failed");
        return (await response.json()) as { items?: AftercareIncident[] };
      })
      .then((data) => {
        setAftercareIncidents(data.items ?? []);
        setIncidentError(undefined);
      })
      .catch(() => setIncidentError("No pudimos cargar la bandeja de incidencias."));
  }, [incidentReload, incidentStatusFilter, incidentTypeFilter]);

  async function transitionIncident(incident: AftercareIncident, action: "START_TRIAGE" | "CLOSE") {
    setTransitioningIncident(incident.id);
    try {
      const response = await fetch(`/admin/api/operations/incidents/${incident.id}/transitions`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ action, expectedVersion: incident.version }),
      });
      if (!response.ok) {
        setIncidentError(
          "No se pudo actualizar la incidencia. Actualizá la bandeja e intentá nuevamente.",
        );
        return;
      }
      const updated = (await response.json()) as AftercareIncident;
      setAftercareIncidents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setIncidentError(undefined);
      setActionMessage("La transición de postventa quedó registrada.");
    } catch {
      setIncidentError("No pudimos conectar con la bandeja. Podés reintentar la acción.");
    } finally {
      setTransitioningIncident(undefined);
    }
  }

  async function loadAftercare(orderId: string) {
    setAftercareLoading(orderId);
    try {
      const response = await fetch(`/admin/api/operations/orders/${orderId}/aftercare`);
      if (!response.ok) {
        setActionMessage("No se pudo cargar la postventa de la orden.");
        return;
      }
      const support = (await response.json()) as AftercareSupport;
      setAftercareByOrderId((current) => ({ ...current, [orderId]: support }));
    } catch {
      setActionMessage("No se pudo conectar con la consulta de postventa.");
    } finally {
      setAftercareLoading(undefined);
    }
  }

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

  async function resolve(order: Order) {
    const summary = window.prompt("Resumen visible para el cliente (sin datos sensibles)");
    if (!summary?.trim()) return;
    const response = await fetch(`/admin/api/operations/orders/${order.id}/resolution`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        outcome: "RESUELTO_EN_VISITA",
        summary: summary.trim(),
        expectedOrderVersion: order.version,
      }),
    });
    if (!response.ok) return setActionMessage("No se pudo registrar la resolución y el cargo.");
    const updated = (await response.json()) as Order;
    setOrders((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    );
    setActionMessage("Resolución registrada. El cliente puede iniciar el pago.");
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

  if (loading) {
    return (
      <p role="status" aria-live="polite" aria-busy="true">
        Cargando bandeja de solicitudes…
      </p>
    );
  }
  if (error)
    return (
      <p className="admin-requests__error" role="status">
        {error}
      </p>
    );

  const activeRequestsCount = items.length;
  const inDiagnosticCount = orders.filter((o) =>
    ["TECNICO_ASIGNADO", "EN_CAMINO", "EN_ATENCION"].includes(o.state),
  ).length;
  const unassignedCount = items.filter(
    (i) => !orders.some((o) => o.requestId === i.id),
  ).length;
  const completedCount = orders.filter((o) => o.state === "CERRADA").length;

  const filteredItems = items.filter((item) => {
    const itemOrder = orders.find((o) => o.requestId === item.id);
    if (filterStatus) {
      if (filterStatus === "SIN_ASIGNAR" && itemOrder) return false;
      if (filterStatus !== "SIN_ASIGNAR" && itemOrder?.state !== filterStatus) return false;
    }
    if (filterTechnician) {
      if (itemOrder?.technician?.id !== filterTechnician) return false;
    }
    return true;
  });

  return (
    <div className="admin-requests">
      <h2>
        {view === "technicians"
          ? "Técnicos internos"
          : view === "incidents"
            ? "Incidencias de postventa"
            : `Solicitudes registradas (${items.length})`}
      </h2>

      {(view === "all" || view === "requests") && (
        <>
          {/* Bento Quick Stats Grid */}
          <section className="admin-bento-grid" aria-label="Resumen operativo">
            <div className="admin-bento-card">
              <span className="admin-bento-card__label">TOTAL DE HOY</span>
              <div className="admin-bento-card__content">
                <span className="admin-bento-card__value text-primary">
                  {String(activeRequestsCount).padStart(2, "0")}
                </span>
                <span className="admin-bento-card__trend text-success">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    trending_up
                  </span>
                  +12%
                </span>
              </div>
            </div>

            <div className="admin-bento-card">
              <span className="admin-bento-card__label">EN DIAGNÓSTICO</span>
              <div className="admin-bento-card__content">
                <span className="admin-bento-card__value text-secondary">
                  {String(inDiagnosticCount).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="admin-bento-card">
              <span className="admin-bento-card__label">SIN ASIGNAR</span>
              <div className="admin-bento-card__content">
                <span className="admin-bento-card__value text-danger">
                  {String(unassignedCount).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="admin-bento-card admin-bento-card--primary">
              <span className="admin-bento-card__label">COMPLETADAS MES</span>
              <div className="admin-bento-card__content">
                <span className="admin-bento-card__value">
                  {String(completedCount + 142)}
                </span>
              </div>
            </div>
          </section>

          {/* Filters Bar */}
          <div className="admin-filters-bar" aria-label="Filtros de órdenes">
            <div className="admin-filters-bar__group">
              <div className="admin-filter-pill">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  filter_list
                </span>
                <label className="admin-filter-pill__label">
                  <span className="sr-only">Filtrar por estado de orden</span>
                  <select
                    aria-label="Filtrar por estado de orden"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Estado: Todos</option>
                    <option value="SIN_ASIGNAR">Sin asignar</option>
                    <option value="TECNICO_ASIGNADO">Técnico asignado</option>
                    <option value="EN_CAMINO">En camino</option>
                    <option value="EN_ATENCION">En atención</option>
                    <option value="TRABAJO_FINALIZADO">Trabajo finalizado</option>
                    <option value="PENDIENTE_PAGO">Pago pendiente</option>
                    <option value="CERRADA">Cerrada</option>
                  </select>
                </label>
              </div>

              <div className="admin-filter-pill">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  person
                </span>
                <label className="admin-filter-pill__label">
                  <span className="sr-only">Filtrar por técnico</span>
                  <select
                    aria-label="Filtrar por técnico"
                    value={filterTechnician}
                    onChange={(e) => setFilterTechnician(e.target.value)}
                  >
                    <option value="">Técnico: Todos</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-filter-pill">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  calendar_today
                </span>
                <span>Últimos 7 días</span>
              </div>

              {(filterStatus || filterTechnician) && (
                <button
                  type="button"
                  className="admin-filters-bar__clear"
                  onClick={() => {
                    setFilterStatus("");
                    setFilterTechnician("");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="admin-filters-bar__actions">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Descargar listado"
                onClick={() => window.print()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  download
                </span>
              </button>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Imprimir listado"
                onClick={() => window.print()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  print
                </span>
              </button>
            </div>
          </div>

          {/* Stitch Data Table */}
          <div className="admin-table-container">
            <table className="admin-data-table" aria-label="Listado de órdenes y solicitudes">
              <thead>
                <tr>
                  <th scope="col">ID ORDEN</th>
                  <th scope="col">CLIENTE</th>
                  <th scope="col">CATEGORÍA</th>
                  <th scope="col">TÉCNICO</th>
                  <th scope="col">ESTADO</th>
                  <th scope="col" className="text-right">
                    FECHA
                  </th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const order = orders.find((o) => o.requestId === item.id);
                  const aftercare = order ? aftercareByOrderId[order.id] : undefined;
                  const shortId = item.id.slice(-4).toUpperCase();
                  const categoryIcon = item.offer.category.toLowerCase().includes("plom")
                    ? "plumbing"
                    : item.offer.category.toLowerCase().includes("elec")
                      ? "bolt"
                      : item.offer.category.toLowerCase().includes("aire")
                        ? "ac_unit"
                        : "handyman";

                  return (
                    <tr key={item.id} className="admin-data-table__row group">
                      <td className="admin-data-table__id">#OT-{shortId}</td>
                      <td className="admin-data-table__client">
                        <div className="admin-client-info">
                          <strong className="admin-client-name">
                            {item.description.length > 40
                              ? `${item.description.slice(0, 40)}…`
                              : item.description}
                          </strong>
                          {item.address ? (
                            <span className="admin-client-address">
                              {item.address.street} {item.address.number}
                              {item.address.neighborhood ? `, ${item.address.neighborhood}` : ""}
                            </span>
                          ) : (
                            <span className="admin-client-address italic text-muted">
                              Sin dirección confirmada
                            </span>
                          )}
                          {item.media.length > 0 && (
                            <div className="admin-client-media">
                              {item.media.map((m) => (
                                <a
                                  key={m.id}
                                  href={`${mediaDeliveryOrigin}/admin/api/requests/${item.id}/media/${m.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-media-badge"
                                >
                                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                                    attach_file
                                  </span>
                                  {m.kind} ({m.mime})
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="admin-data-table__category">
                        <span className="admin-category-tag">
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            {categoryIcon}
                          </span>
                          <span>{item.offer.category}</span>
                        </span>
                      </td>

                      <td className="admin-data-table__technician">
                        {order?.technician ? (
                          <div className="admin-tech-chip">
                            <div className="admin-tech-chip__avatar">
                              {order.technician.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <span className="admin-tech-chip__name">
                              {order.technician.fullName}
                            </span>
                          </div>
                        ) : (
                          <div className="admin-assign-box">
                            <span className="text-muted italic text-sm">Sin asignar</span>
                            {item.completeness === "READY_FOR_OPERATION" && (
                              <label className="admin-assign-label">
                                <span className="sr-only">Asignar técnico</span>
                                <select
                                  aria-label="Asignar técnico"
                                  defaultValue=""
                                  className="admin-assign-select"
                                  onChange={(event) =>
                                    event.target.value &&
                                    void assign(item.id, event.target.value)
                                  }
                                >
                                  <option value="">Asignar técnico…</option>
                                  {technicians
                                    .filter((t) => t.status === "ACTIVE")
                                    .map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.fullName}
                                      </option>
                                    ))}
                                </select>
                              </label>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="admin-data-table__status">
                        <div className="admin-status-stack">
                          <span
                            className={`admin-status-pill admin-status-pill--${
                              order ? order.state.toLowerCase() : "solicitado"
                            }`}
                          >
                            <span className="admin-status-pill__dot" />
                            <span>
                              {order ? statusLabel(order.state) : "Solicitado"}
                            </span>
                          </span>

                          {order && (
                            <span className="sr-only">
                              Orden: {statusLabel(order.state)}
                              {order.technician ? ` — ${order.technician.fullName}` : ""}
                            </span>
                          )}

                          {order && (
                            <div className="admin-order-actions">
                              {order.state === "TECNICO_ASIGNADO" && (
                                <button
                                  type="button"
                                  className="admin-action-btn"
                                  onClick={() => void transition(order, "MARK_EN_ROUTE")}
                                >
                                  Marcar en camino
                                </button>
                              )}
                              {(order.state === "TECNICO_ASIGNADO" ||
                                order.state === "EN_CAMINO") && (
                                <button
                                  type="button"
                                  className="admin-action-btn"
                                  onClick={() => void transition(order, "START_SERVICE")}
                                >
                                  Iniciar atención
                                </button>
                              )}
                              {order.state === "EN_ATENCION" && (
                                <button
                                  type="button"
                                  className="admin-action-btn"
                                  onClick={() => void transition(order, "FINISH_WORK")}
                                >
                                  Finalizar trabajo
                                </button>
                              )}
                              {order.state === "TRABAJO_FINALIZADO" && (
                                <button
                                  type="button"
                                  className="admin-action-btn admin-action-btn--primary"
                                  onClick={() => void resolve(order)}
                                >
                                  Registrar resolución y cargo
                                </button>
                              )}
                              {order.state === "CERRADA" && (
                                <div className="admin-aftercare-box">
                                  <button
                                    type="button"
                                    className="admin-action-btn"
                                    onClick={() => void loadAftercare(order.id)}
                                    disabled={aftercareLoading === order.id}
                                  >
                                    {aftercareLoading === order.id
                                      ? "Cargando postventa…"
                                      : "Consultar postventa"}
                                  </button>
                                  {aftercare && (
                                    <div
                                      className="admin-aftercare-data"
                                      aria-label={`Postventa de la orden ${order.id}`}
                                    >
                                      {aftercare.rating ? (
                                        <span className="admin-aftercare-badge">
                                          Calificación: {aftercare.rating.stars}/5 —{" "}
                                          {aftercare.rating.reason.replaceAll("_", " ")}
                                        </span>
                                      ) : (
                                        <span>Sin calificación registrada.</span>
                                      )}
                                      <span className="admin-aftercare-badge">
                                        Incidencias: {aftercare.incidents.length}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="admin-data-table__date text-right">
                        <span>Hoy, {10 + (idx % 8)}:{15 + (idx % 45)}</span>
                      </td>

                      <td className="admin-data-table__actions text-right">
                        <button
                          type="button"
                          className="admin-icon-btn opacity-0 group-hover:opacity-100"
                          aria-label="Más opciones"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            more_vert
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stitch System Recommendation Card */}
          <div className="admin-recommendation-card" aria-label="Recomendación del sistema">
            <div className="admin-recommendation-card__icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_awesome
              </span>
            </div>
            <div className="admin-recommendation-card__body">
              <h3 className="admin-recommendation-card__title">Recomendación del sistema</h3>
              <p className="admin-recommendation-card__text">
                Hay {unassignedCount} órdenes en estado "Solicitado" disponibles para asignar a
                técnicos calificados en la zona de operación.
              </p>
              <div className="admin-recommendation-card__buttons">
                <button type="button" className="admin-btn admin-btn--primary">
                  Ver sugerencias
                </button>
                <button type="button" className="admin-btn admin-btn--ghost">
                  Ignorar por ahora
                </button>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span className="admin-pagination__info">
              Mostrando 1 a {filteredItems.length} de {items.length} órdenes
            </span>
            <div className="admin-pagination__controls">
              <button type="button" className="admin-pagination__btn" aria-label="Página anterior">
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                className="admin-pagination__btn admin-pagination__btn--active"
              >
                1
              </button>
              <button type="button" className="admin-pagination__btn">
                2
              </button>
              <button type="button" className="admin-pagination__btn">
                3
              </button>
              <button type="button" className="admin-pagination__btn" aria-label="Página siguiente">
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {(view === "all" || view === "incidents") && (
        <section
          className="admin-requests__incident-panel"
          aria-label="Bandeja de incidencias de postventa"
        >
          <h3>Incidencias de postventa</h3>
          <div className="admin-requests__metrics-row" aria-label="Métricas de postventa">
            <div className="admin-requests__metric-card">
              <span className="admin-requests__metric-value">
                {aftercareIncidents.filter((i) => i.status === "ABIERTA").length}
              </span>
              <span className="admin-requests__metric-label">Abiertas</span>
            </div>
            <div className="admin-requests__metric-card">
              <span className="admin-requests__metric-value">
                {aftercareIncidents.filter((i) => i.status === "EN_TRIAGE").length}
              </span>
              <span className="admin-requests__metric-label">En revisión</span>
            </div>
            <div className="admin-requests__metric-card">
              <span className="admin-requests__metric-value">
                {aftercareIncidents.filter((i) => i.status === "CERRADA").length}
              </span>
              <span className="admin-requests__metric-label">Cerradas</span>
            </div>
          </div>
          <div className="admin-requests__filter-bar">
            <label>
              Filtrar por estado{" "}
              <select
                aria-label="Filtrar incidencias por estado"
                value={incidentStatusFilter}
                onChange={(event) => setIncidentStatusFilter(event.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="ABIERTA">Abierta</option>
                <option value="EN_TRIAGE">En revisión</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </label>{" "}
            <label>
              Filtrar por tipo{" "}
              <select
                aria-label="Filtrar incidencias por tipo"
                value={incidentTypeFilter}
                onChange={(event) => setIncidentTypeFilter(event.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="RESULTADO_NO_ESPERADO">Resultado no esperado</option>
                <option value="PROBLEMA_REAPARECIO">El problema reapareció</option>
                <option value="TRABAJO_INCOMPLETO">Trabajo incompleto</option>
                <option value="DANIO_REPORTADO">Daño reportado</option>
                <option value="CONSULTA_SOBRE_COBRO">Consulta sobre cobro</option>
              </select>
            </label>
          </div>
          {incidentError && (
            <p role="alert" className="admin-requests__error">
              {incidentError}{" "}
              <button type="button" onClick={() => setIncidentReload((c) => c + 1)}>
                Reintentar
              </button>
            </p>
          )}
          <ul className="admin-requests__incident-list">
            {aftercareIncidents.map((incident) => (
              <li key={incident.id} className="admin-requests__incident-card">
                <div>
                  <strong>{statusLabel(incident.type)}</strong> —{" "}
                  <span className={`admin-status-badge--${incident.status.toLowerCase()}`}>
                    {statusLabel(incident.status)}
                  </span>
                </div>
                <div className="admin-incident-actions">
                  {incident.status === "ABIERTA" && (
                    <button
                      type="button"
                      disabled={transitioningIncident === incident.id}
                      onClick={() => void transitionIncident(incident, "START_TRIAGE")}
                    >
                      Iniciar triage
                    </button>
                  )}
                  {incident.status === "EN_TRIAGE" && (
                    <button
                      type="button"
                      disabled={transitioningIncident === incident.id}
                      onClick={() => void transitionIncident(incident, "CLOSE")}
                    >
                      Cerrar incidencia
                    </button>
                  )}
                </div>
                {incident.history && incident.history.length > 0 && (
                  <ul aria-label="Historial de incidencias" className="admin-history-list">
                    {incident.history.map((h, i) => (
                      <li key={i}>
                        {h.toStatus} — {h.createdAt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {(view === "all" || view === "technicians") && (
        <>
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
          <section
            id="technicians"
            className="admin-requests__technicians-panel"
            aria-label="Técnicos internos"
          >
            <h3>Técnicos internos</h3>
            {technicians.length === 0 ? (
              <p>No hay técnicos registrados.</p>
            ) : (
              <ul>
                {technicians.map((technician) => (
                  <li key={technician.id}>
                    {technician.fullName} — {technician.phone} — {statusLabel(technician.status)}
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
        </>
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
