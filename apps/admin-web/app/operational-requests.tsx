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

export function OperationalRequests() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/admin/api/requests")
      .then(async (res) => {
        if (res.status === 401) {
          setError("Iniciá sesión como ADMIN o DISPATCHER para acceder a la bandeja.");
          return;
        }
        if (!res.ok) throw new Error("list-failed");
        const data = (await res.json()) as { items?: RequestItem[] };
        setItems(data.items ?? []);
      })
      .catch(() => setError("Error al cargar la bandeja de solicitudes."))
      .finally(() => setLoading(false));
  }, []);

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
      {items.length === 0 ? (
        <p>No hay solicitudes registradas en la bandeja.</p>
      ) : (
        <ul className="admin-requests__list">
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
                            href={`/admin/api/requests/${item.id}/media/${m.id}`}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
