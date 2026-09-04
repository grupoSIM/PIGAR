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
          <div className="product-shell__brand-block">
            <a className="product-shell__brand" href="/admin" aria-label="PIGAR administración">
              <span className="product-shell__brand-logo" aria-hidden="true">
                P
              </span>
              <strong>PIGAR</strong>
            </a>
            <p className="product-shell__role">Administración</p>
          </div>
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
              <span className="material-symbols-outlined product-shell__nav-icon" aria-hidden="true">
                dashboard
              </span>
              <span>Bandeja operativa</span>
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/technicians" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/technicians"
              aria-current={activeAdminPath === "/admin/technicians" ? "page" : undefined}
              onClick={closeNavigation}
            >
              <span className="material-symbols-outlined product-shell__nav-icon" aria-hidden="true">
                engineering
              </span>
              <span>Técnicos</span>
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/requests" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/requests"
              aria-current={activeAdminPath === "/admin/requests" ? "page" : undefined}
              onClick={closeNavigation}
            >
              <span className="material-symbols-outlined product-shell__nav-icon" aria-hidden="true">
                shopping_cart
              </span>
              <span>Solicitudes</span>
            </a>
            <a
              className={`product-shell__nav-link${activeAdminPath === "/admin/incidents" ? " product-shell__nav-link--active" : ""}`}
              href="/admin/incidents"
              aria-current={activeAdminPath === "/admin/incidents" ? "page" : undefined}
              onClick={closeNavigation}
            >
              <span className="material-symbols-outlined product-shell__nav-icon" aria-hidden="true">
                report_problem
              </span>
              <span>Incidencias</span>
            </a>
          </nav>
          <div className="product-shell__sidebar-footer">
            <div className="product-shell__profile-card">
              <div className="product-shell__profile-avatar">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB35UcGa4U-ZYF_9UgYdiT8AMned8YZlXfIxalgNLVvWKUM3SGaAA62hJaZzOY6aOU9j_EJbUMdJeROvMWvbeJ3zTobP-VgSXHn0hW3J1psQ7vAg7qT4CnlVkC_ljctBLENC1DQgVRu1OOFEqD2IR-oGnC750-1yLv_8qrQ7IzPcN-eH7wA1mkzMhhzsZMBSZtWWrpu4_FqxbnP46Jajw7aC_Sh7IXOCbTLSWD7UWv3izCbPA--JIf4"
                  alt="Admin Principal"
                />
              </div>
              <div className="product-shell__profile-info">
                <span className="product-shell__profile-name">Admin Principal</span>
                <span className="product-shell__profile-sub">Ver Perfil</span>
              </div>
            </div>
            <p className="product-shell__sidebar-note">
              La operación se registra con trazabilidad y permisos por rol.
            </p>
          </div>
        </aside>
      )}
      <div className="product-shell__workspace">
        <header className="product-shell__header">
          {isAdmin ? (
            <div className="product-shell__topbar-admin">
              <div className="product-shell__searchbox">
                <span className="material-symbols-outlined product-shell__search-icon" aria-hidden="true">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar órdenes, clientes o técnicos..."
                  className="product-shell__search-input"
                  aria-label="Buscar en administración"
                />
              </div>
              <div className="product-shell__topbar-actions">
                <button
                  type="button"
                  className="product-shell__icon-btn"
                  aria-label="Ver notificaciones del sistema"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    notifications
                  </span>
                </button>
                <button
                  type="button"
                  className="product-shell__icon-btn"
                  aria-label="Ayuda del sistema"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    help
                  </span>
                </button>
                <div className="product-shell__topbar-divider" />
                <a
                  href="/admin/requests"
                  className="product-shell__new-order-btn"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    add
                  </span>
                  <span>Nueva Orden</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="product-shell__topbar-customer">
              <a className="product-shell__brand" href="/" aria-label="Inicio de PIGAR">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">
                  location_on
                </span>
                <strong>Inicio PIGAR</strong>
              </a>
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
              <div className="product-shell__customer-avatar">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC2F9RIPMyaMdTsItW1HTufLskCwrlopL0Ks8A-iODLbAYudEJw5Vl_QJ2TqUUiKUs1lfSuWd_3JwGLsH_WBsukVPTOTHYNBAJ-81YMrpnukk4bL5MPs0DpXErlEcQbXE1nQkOOvu5lcFktVnRZkzKhzRXnPvp9rQzv8qPllZ7siugLNeGC9xeFyfVzWY5JBEzhjIWM3jD7pc6Iv7hAqlg3p2gwyvxYPjFYNjP6oTv5RSn2xJhh7zd"
                  alt="Perfil de usuario"
                />
              </div>
            </div>
          )}
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
        {!isAdmin && (
          <nav className="product-shell__bottom-nav" aria-label="Navegación móvil inferior">
            <a
              href="/"
              aria-label="Ir al inicio de cliente"
              className={`product-shell__bottom-nav-item${activeCustomerPath === "/" ? " product-shell__bottom-nav-item--active" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">home</span>
              <span>Inicio</span>
            </a>
            <a
              href="/requests"
              aria-label="Ver bandeja de solicitudes"
              className={`product-shell__bottom-nav-item${activeCustomerPath === "/requests" ? " product-shell__bottom-nav-item--active" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
              <span>Solicitudes</span>
            </a>
            <a
              href="/profile"
              aria-label="Mi cuenta de cliente"
              className={`product-shell__bottom-nav-item${activeCustomerPath === "/profile" ? " product-shell__bottom-nav-item--active" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">person</span>
              <span>Cuenta</span>
            </a>
          </nav>
        )}
      </div>
    </main>
  );
}
