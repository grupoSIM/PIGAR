"use client";

import { useEffect, useRef, useState } from "react";

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
            {item.order?.state === "CERRADA" && <Aftercare requestId={item.id} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

type Incident = {
  id: string;
  type: string;
  status: string;
  history: Array<{ action: string; toStatus: string; createdAt: string }>;
};
function Aftercare({ requestId }: { requestId: string }) {
  const [reason, setReason] = useState("CALIDAD_DEL_TRABAJO");
  const [stars, setStars] = useState("5");
  const [otherMessage, setOtherMessage] = useState("");
  const [incidentType, setIncidentType] = useState("RESULTADO_NO_ESPERADO");
  const [notice, setNotice] = useState<string>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rated, setRated] = useState(false);
  const [noticeKind, setNoticeKind] = useState<"status" | "error">("status");
  const [submitting, setSubmitting] = useState<"rating" | "incident" | null>(null);
  const [otherError, setOtherError] = useState(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  function notify(message: string, kind: "status" | "error") {
    setNoticeKind(kind);
    setNotice(message);
  }

  useEffect(() => {
    void Promise.all([
      fetch(`/api/requests/${requestId}/rating`),
      fetch(`/api/requests/${requestId}/incidents`),
    ])
      .then(async ([rating, listed]) => {
        setRated(rating.ok);
        if (listed.ok) setIncidents(((await listed.json()) as { items?: Incident[] }).items ?? []);
      })
      .catch(() => notify("No pudimos cargar la información de postventa.", "error"));
  }, [requestId]);

  useEffect(() => {
    if (noticeKind === "error") noticeRef.current?.focus();
  }, [notice, noticeKind]);

  async function rate() {
    if (reason === "OTRO" && !otherMessage.trim()) {
      setOtherError(true);
      notify("Escribí un motivo breve para continuar.", "error");
      otherInputRef.current?.focus();
      return;
    }
    setSubmitting("rating");
    try {
      const response = await fetch(`/api/requests/${requestId}/rating`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          stars: Number(stars),
          reason,
          ...(reason === "OTRO" ? { otherMessage } : {}),
        }),
      });
      if (!response.ok) {
        const retryAfter = response.headers.get("retry-after");
        notify(
          response.status === 429 && retryAfter
            ? `Demasiados intentos. Esperá ${retryAfter} segundos y volvé a intentar.`
            : "No pudimos registrar la calificación. Revisá los datos e intentá nuevamente.",
          "error",
        );
        return;
      }
      setRated(true);
      notify("La calificación quedó registrada y no puede editarse.", "status");
    } catch {
      notify("No pudimos conectar con postventa. Intentá nuevamente.", "error");
    } finally {
      setSubmitting(null);
    }
  }
  async function openIncident() {
    setSubmitting("incident");
    try {
      const response = await fetch(`/api/requests/${requestId}/incidents`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ type: incidentType }),
      });
      if (!response.ok) {
        const retryAfter = response.headers.get("retry-after");
        notify(
          response.status === 429 && retryAfter
            ? `Demasiados intentos. Esperá ${retryAfter} segundos y volvé a intentar.`
            : "No pudimos abrir la incidencia. Sólo puede haber una activa por orden.",
          "error",
        );
        return;
      }
      const incident = (await response.json()) as Incident;
      setIncidents((current) => [incident, ...current]);
      notify("La incidencia quedó abierta para revisión.", "status");
    } catch {
      notify("No pudimos conectar con postventa. Intentá nuevamente.", "error");
    } finally {
      setSubmitting(null);
    }
  }
  return (
    <section aria-label="Postventa" className="customer-requests__aftercare">
      <h3>Postventa</h3>
      {notice && (
        <p ref={noticeRef} role={noticeKind === "error" ? "alert" : "status"} tabIndex={-1}>
          {notice}
        </p>
      )}
      {rated ? (
        <p>Tu calificación ya fue registrada.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void rate();
          }}
        >
          <fieldset>
            <legend>Calificá el trabajo</legend>
            <label>
              Estrellas{" "}
              <select value={stars} onChange={(event) => setStars(event.target.value)}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} estrella{value === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo{" "}
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {[
                  "CALIDAD_DEL_TRABAJO",
                  "PUNTUALIDAD",
                  "TRATO_Y_COMUNICACION",
                  "CLARIDAD_DEL_PROCESO",
                  "EXPERIENCIA_GENERAL",
                  "OTRO",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {reason === "OTRO" && (
              <label>
                Contanos brevemente{" "}
                <input
                  ref={otherInputRef}
                  value={otherMessage}
                  onChange={(event) => {
                    setOtherMessage(event.target.value);
                    setOtherError(false);
                  }}
                  minLength={1}
                  maxLength={100}
                  required
                  aria-invalid={otherError}
                  aria-describedby="other-message-help other-message-count other-message-error"
                />
                <span id="other-message-help">No incluyas datos personales, enlaces ni HTML.</span>
                <span id="other-message-count">{otherMessage.length}/100 caracteres</span>
                {otherError && (
                  <span id="other-message-error" role="alert">
                    El motivo es obligatorio.
                  </span>
                )}
              </label>
            )}
            <button type="submit" disabled={submitting !== null}>
              {submitting === "rating" ? "Registrando…" : "Registrar calificación"}
            </button>
          </fieldset>
        </form>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void openIncident();
        }}
      >
        <fieldset disabled={incidents.some((incident) => incident.status !== "CERRADA")}>
          <legend>Abrir incidencia estructurada</legend>
          <label>
            Tipo{" "}
            <select value={incidentType} onChange={(event) => setIncidentType(event.target.value)}>
              {[
                "RESULTADO_NO_ESPERADO",
                "PROBLEMA_REAPARECIO",
                "TRABAJO_INCOMPLETO",
                "DANIO_REPORTADO",
                "CONSULTA_SOBRE_COBRO",
              ].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting !== null}>
            {submitting === "incident" ? "Abriendo…" : "Abrir incidencia"}
          </button>
        </fieldset>
      </form>
      {incidents.length > 0 && (
        <ul aria-label="Historial de incidencias">
          {incidents.map((incident) => (
            <li key={incident.id}>
              {incident.type.replaceAll("_", " ")} — {incident.status}
              <ul>
                {incident.history.map((entry) => (
                  <li key={`${entry.action}-${entry.createdAt}`}>
                    {entry.toStatus} — {new Date(entry.createdAt).toLocaleString("es-AR")}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
