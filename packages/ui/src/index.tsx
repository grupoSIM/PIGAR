"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ProductShellProps = {
  audience: "clientes" | "administración";
  title: string;
  currentPath: string;
  children: ReactNode;
};

export function ProductShell({ audience, title, currentPath, children }: ProductShellProps) {
  const isAdmin = audience === "administración";
  const activeCustomerPath =
    currentPath === "/" ? "/" : currentPath.startsWith("/requests") ? "/requests" : "/profile";
  const activeAdminPath =
    currentPath === "/admin"
      ? "/admin"
      : currentPath.startsWith("/admin/technicians")
        ? "/admin/technicians"
        : currentPath.startsWith("/admin/incidents")
          ? "/admin/incidents"
          : "/admin/requests";
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const navigationToggleRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isAdmin || !isNavigationOpen) return;
    const navigation = navigationRef.current;
    const toggle = navigationToggleRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsNavigationOpen(false);
        toggle?.focus();
        return;
      }
      if (event.key !== "Tab" || !navigation) return;
      const focusable = Array.from(navigation.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(
      () => navigation?.querySelector<HTMLElement>(focusableSelector)?.focus(),
      0,
    );
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdmin, isNavigationOpen]);

  function closeNavigation() {
    setIsNavigationOpen(false);
    navigationToggleRef.current?.focus();
  }

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
            onClick={() => {
              if (isNavigationOpen) closeNavigation();
              else setIsNavigationOpen(true);
            }}
            ref={navigationToggleRef}
            type="button"
          >
            {isNavigationOpen ? "Cerrar navegación" : "Abrir navegación"}
          </button>
          <nav
            className={`product-shell__nav${isNavigationOpen ? " product-shell__nav--open" : ""}`}
            id="admin-navigation"
            aria-label="Navegación administrativa"
            ref={navigationRef}
          >
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin" ? " product-shell__nav-link--active" : ""}`}
              href="/admin"
              aria-current={activeAdminPath === "/admin" ? "page" : undefined}
              onClick={closeNavigation}
            >
              Bandeja operativa
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/technicians" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/technicians"
              aria-current={activeAdminPath === "/admin/technicians" ? "page" : undefined}
              onClick={closeNavigation}
            >
              Técnicos
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/requests" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/requests"
              aria-current={activeAdminPath === "/admin/requests" ? "page" : undefined}
              onClick={closeNavigation}
            >
              Solicitudes
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/incidents" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/incidents"
              aria-current={activeAdminPath === "/admin/incidents" ? "page" : undefined}
              onClick={closeNavigation}
            >
              Incidencias
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
          {!isAdmin && (
            <nav className="product-shell__customer-nav" aria-label="Navegación principal">
              <a
                className={`product-shell__customer-nav-link${activeCustomerPath === "/" ? " product-shell__customer-nav-link--active" : ""}`}
                href="/"
                aria-current={activeCustomerPath === "/" ? "page" : undefined}
              >
                Inicio
              </a>
              <a
                className={`product-shell__customer-nav-link${activeCustomerPath === "/requests" ? " product-shell__customer-nav-link--active" : ""}`}
                href="/requests"
                aria-current={activeCustomerPath === "/requests" ? "page" : undefined}
              >
                Mis solicitudes
              </a>
              <a
                className={`product-shell__customer-nav-link${activeCustomerPath === "/profile" ? " product-shell__customer-nav-link--active" : ""}`}
                href="/profile"
                aria-current={activeCustomerPath === "/profile" ? "page" : undefined}
              >
                Perfil
              </a>
            </nav>
          )}
          <div className="product-shell__header-meta">
            <span className="product-shell__eyebrow">{audience}</span>
            {isAdmin && <span className="product-shell__workspace-label">Consola operativa</span>}
          </div>
        </header>
        <section
          id={isAdmin ? undefined : "home"}
          className="product-shell__content"
          aria-labelledby="page-title"
        >
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
