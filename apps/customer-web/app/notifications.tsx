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
  const [tab, setTab] = useState<"all" | "unread">("all");
  async function load(cursor?: string, append = false) {
    setError(false);
    try {
      const response = await fetch(
        cursor ? `/api/notifications?cursor=${encodeURIComponent(cursor)}` : "/api/notifications",
      );
      if (!response.ok) throw new Error();
      const next = (await response.json()) as Page;
      setPage((current) =>
        append && current ? { ...next, items: [...current.items, ...next.items] } : next,
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
  }
  async function markAllAsRead() {
    if (!page?.items) return;
    const unread = page.items.filter((i) => !i.readAt);
    for (const item of unread) {
      await visit(item);
    }
  }
  const displayedItems =
    tab === "unread" ? (page?.items.filter((item) => !item.readAt) ?? []) : (page?.items ?? []);
  return (
    <section className="notifications" aria-label="Notificaciones">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        Notificaciones{page?.unreadCount ? ` (${page.unreadCount} sin leer)` : ""}
      </button>
      {open && (
        <div role="region" aria-live="polite">
          <div className="notifications__header-bar">
            <h2>Notificaciones</h2>
            {Boolean(page?.unreadCount) && (
              <button
                type="button"
                className="notifications__mark-all"
                onClick={() => void markAllAsRead()}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="notifications__tabs" role="tablist" aria-label="Filtro de notificaciones">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              className={`notifications__tab ${tab === "all" ? "notifications__tab--active" : ""}`}
              onClick={() => setTab("all")}
            >
              Todas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "unread"}
              className={`notifications__tab ${tab === "unread" ? "notifications__tab--active" : ""}`}
              onClick={() => setTab("unread")}
            >
              No leídas{page?.unreadCount ? ` (${page.unreadCount})` : ""}
            </button>
          </div>
          {!page && !error && <p>Cargando notificaciones…</p>}
          {error && (
            <p role="status">
              No pudimos cargar las notificaciones. Tus solicitudes siguen disponibles.
            </p>
          )}
          {page?.items.length === 0 && <p>No tenés notificaciones todavía.</p>}
          {page?.items && page.items.length > 0 && displayedItems.length === 0 && (
            <p>No tenés notificaciones sin leer.</p>
          )}
          <ul>
            {displayedItems.map((item) => (
              <li
                key={item.id}
                className={
                  item.readAt
                    ? "notifications__item"
                    : "notifications__item notifications__item--unread"
                }
              >
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
            <button
              className="customer-action customer-action--secondary notifications__control"
              type="button"
              onClick={() => void load(page.nextCursor ?? undefined, true)}
            >
              Cargar más
            </button>
          )}
          <button
            className="customer-action customer-action--secondary notifications__control"
            type="button"
            onClick={() => void load()}
          >
            Actualizar
          </button>
        </div>
      )}
    </section>
  );
}
