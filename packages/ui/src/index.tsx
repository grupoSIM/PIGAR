"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ProductShellProps = {
  audience: "clientes" | "administración";
  title: string;
  children: ReactNode;
};

export function ProductShell({ audience, title, children }: ProductShellProps) {
  const isAdmin = audience === "administración";
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  return (
    <main className={`product-shell product-shell--${isAdmin ? "admin" : "customer"}`}>
      {isAdmin && (
        <aside className="product-shell__sidebar" aria-label="Panel administrativo">
          <a className="product-shell__brand" href="/admin" aria-label="PIGAR administración">
            <span aria-hidden="true">P</span>
            <strong>PIGAR</strong>
          </a>
          <p className="product-shell__role">Administración</p>
          <button
            aria-controls="admin-navigation"
            aria-expanded={isNavigationOpen}
            className="product-shell__nav-toggle"
            onClick={() => setIsNavigationOpen((isOpen) => !isOpen)}
            type="button"
          >
            {isNavigationOpen ? "Cerrar navegación" : "Abrir navegación"}
          </button>
          <nav
            className={`product-shell__nav${isNavigationOpen ? " product-shell__nav--open" : ""}`}
            id="admin-navigation"
            aria-label="Navegación administrativa"
          >
            <a
              className="product-shell__nav-link product-shell__nav-link--active"
              href="/admin"
              onClick={() => setIsNavigationOpen(false)}
            >
              Bandeja operativa
            </a>
            <a className="product-shell__nav-link" href="#technicians" onClick={() => setIsNavigationOpen(false)}>
              Técnicos
            </a>
            <a className="product-shell__nav-link" href="#requests" onClick={() => setIsNavigationOpen(false)}>
              Solicitudes
            </a>
          </nav>
          <p className="product-shell__sidebar-note">
            La operación se registra con trazabilidad y permisos por rol.
          </p>
        </aside>
      )}
      <div className="product-shell__workspace">
        <header className="product-shell__header">
          {!isAdmin && (
            <a className="product-shell__brand" href="/" aria-label="Inicio de PIGAR">
              <span aria-hidden="true">P</span>
              <strong>PIGAR</strong>
            </a>
          )}
          <p className="product-shell__eyebrow">{audience}</p>
        </header>
        <section className="product-shell__content" aria-labelledby="page-title">
          <div className="product-shell__title-row">
            <div>
              <p className="product-shell__overline">PIGAR · {audience}</p>
              <h1 id="page-title">{title}</h1>
            </div>
            {isAdmin && <span className="product-shell__live">Operación en línea</span>}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
