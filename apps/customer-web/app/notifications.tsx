"use client";
import { useEffect, useState } from "react";
type Notice = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  readAt: string | null;
  target: { requestId: string };
};
type Page = { items: Notice[]; unreadCount: number; nextCursor: string | null };
export function Notifications() {
  const [page, setPage] = useState<Page>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  async function load(cursor?: string, append = false) {
    setError(false);
    try {
      const response = await fetch(
        cursor ? `/api/notifications?cursor=${encodeURIComponent(cursor)}` : "/api/notifications",
      );
      if (!response.ok) throw new Error();
      const next = (await response.json()) as Page;
      setPage((current) =>
        append && current
          ? { ...next, items: [...current.items, ...next.items] }
          : next,
      );
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function visit(item: Notice) {
    if (!item.readAt) {
      const read = await fetch(`/api/notifications/${item.id}/read`, { method: "PUT" });
      if (!read.ok) {
        setError(true);
        return;
      }
      const updated = (await read.json()) as Notice;
      setPage((current) =>
        !current
          ? current
          : {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              items: current.items.map((notice) => (notice.id === item.id ? updated : notice)),
            },
      );
    }
    const response = await fetch(`/api/requests/${encodeURIComponent(item.target.requestId)}/order`);
    if (!response.ok) {
      setError(true);
      return;
    }
    window.location.assign(`/?request=${encodeURIComponent(item.target.requestId)}`);
  }
  return (
    <section className="notifications" aria-label="Notificaciones">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        Notificaciones{page?.unreadCount ? ` (${page.unreadCount} sin leer)` : ""}
      </button>
      {open && (
        <div role="region" aria-live="polite">
          <h2>Notificaciones</h2>
          {!page && !error && <p>Cargando notificaciones…</p>}
          {error && (
            <p role="status">
              No pudimos cargar las notificaciones. Tus solicitudes siguen disponibles.
            </p>
          )}
          {page?.items.length === 0 && <p>No tenés notificaciones todavía.</p>}
          <ul>
            {page?.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void visit(item)}
                  aria-label={`${item.title}. ${item.readAt ? "Leída" : "Sin leer"}`}
                >
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("es-AR")}
                  </time>
                  <span>{item.readAt ? "Leída" : "Sin leer"}</span>
                </button>
              </li>
            ))}
          </ul>
          {page?.nextCursor && (
            <button type="button" onClick={() => void load(page.nextCursor ?? undefined, true)}>
              Cargar más
            </button>
          )}
          <button type="button" onClick={() => void load()}>
            Actualizar
          </button>
        </div>
      )}
    </section>
  );
}
