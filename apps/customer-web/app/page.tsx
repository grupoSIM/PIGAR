import { ProductShell } from "@pigar/ui";
import { auth0 } from "../lib/auth0";

export const dynamic = "force-dynamic";

export default async function CustomerHome() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();
  const configuredBaseUrl =
    process.env.PIGAR_CUSTOMER_AUTH0_APP_BASE_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3000";
  const appBaseUrl = configuredBaseUrl.replace(/\/$/, "");
  const logoutHref = `/auth/logout?returnTo=${encodeURIComponent(`${appBaseUrl}/`)}`;

  return (
    <ProductShell audience="clientes" title="Inicio PIGAR" currentPath="/">
      {/* Stitch Welcome Header */}
      <section className="customer-welcome" aria-label="Bienvenida al cliente">
        <div className="flex flex-col gap-1">
          <p className="customer-welcome__title font-bold text-xl text-primary">Bienvenido</p>
          <div className="customer-welcome__address">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              home_pin
            </span>
            <span>Servicios profesionales para tu hogar</span>
          </div>
        </div>
      </section>

      {/* Stitch Big CTA */}
      <a className="customer-stitch-cta" href="/requests/new" aria-label="Solicitar servicio para el hogar">
        <span className="material-symbols-outlined font-bold" aria-hidden="true">
          add_circle
        </span>
        <span>Solicitar Servicio</span>
      </a>

      {/* Stitch Service Categories Grid */}
      <section className="customer-categories-section" aria-label="Categorías de servicio">
        <h3 className="customer-section-title">Servicios para el Hogar</h3>
        <div className="customer-categories-grid">
          <a href="/requests/new" className="customer-category-card">
            <div className="customer-category-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                plumbing
              </span>
            </div>
            <span className="customer-category-name">Plomería</span>
          </a>
          <a href="/requests/new" className="customer-category-card">
            <div className="customer-category-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                bolt
              </span>
            </div>
            <span className="customer-category-name">Electricidad</span>
          </a>
          <a href="/requests/new" className="customer-category-card">
            <div className="customer-category-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                key
              </span>
            </div>
            <span className="customer-category-name">Cerrajería</span>
          </a>
          <a href="/requests/new" className="customer-category-card">
            <div className="customer-category-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                ac_unit
              </span>
            </div>
            <span className="customer-category-name">Climatización</span>
          </a>
        </div>
      </section>

      {/* Hero / Information Card (Preserved for tests & contract) */}
      <section className="customer-hero" aria-label="Información de la visita">
        <div>
          <p className="customer-hero__badge">Visita Simple</p>
          <p className="customer-hero__price">ARS 50.000 final</p>
          <p>
            Incluye la visita, el diagnóstico y los arreglos que puedan completarse según lo
            informado. Si el trabajo excede ese alcance, te presentaremos un presupuesto.
          </p>
        </div>
        <ul className="customer-hero__facts" aria-label="Qué necesitás para solicitar la visita">
          <li>Contanos el problema</li>
          <li>Confirmá el domicilio</li>
          <li>Sumá una foto o video</li>
        </ul>
      </section>

      {/* Stitch Active Service Card */}
      <section className="customer-active-service" aria-label="Servicio activo">
        <div className="customer-active-service__header">
          <div>
            <h3 className="customer-active-service__title">Reparación de Plomería</h3>
            <p className="customer-active-service__desc">Servicio estándar en curso</p>
          </div>
          <span className="customer-status-badge customer-status-badge--en_camino">
            En camino
          </span>
        </div>

        <div className="customer-technician-box">
          <div className="customer-technician-avatar">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9may0zzNqak59VxpYjqNAEZGK9w9ku_ozuxAYF54Pa0-zzUZyC2xfT9lA9M007N5MkZx3w41Lj8Nnhd4fis-OFQ7WC61zYXrpZsWLP_jL3OB3FUSdJkI-7CAxoj_gVdp0m1g12jUTy8hTKxn_53AWhtZUXI1qQ9rdRzHw_48Cpx8aYETHHB6tlFE-a-w6k0ZGozWWitNLiNi-MMNUDwp3IrRmSHV-vhgqLzrJAnyuGm269s2sGV_s"
              alt="Técnico Marco Rossi"
            />
          </div>
          <div>
            <span className="text-muted text-xs block">Técnico asignado</span>
            <strong className="text-base text-navy block">Marco Rossi</strong>
            <span className="text-xs text-yellow-dark flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                star
              </span>
              4.9 (más de 120 trabajos)
            </span>
          </div>
        </div>

        {/* WhatsApp Action */}
        <a
          href="https://wa.me/5491155550000"
          target="_blank"
          rel="noopener noreferrer"
          className="customer-whatsapp-btn"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chat
          </span>
          <span>Contactar por WhatsApp</span>
        </a>

        {/* Timeline */}
        <div className="customer-timeline mt-4 pt-4 border-t border-slate-100">
          <div className="timeline-step">
            <div className="timeline-dot" />
            <p className="timeline-step__title">Solicitud recibida</p>
            <p className="timeline-step__time">09:15 hs</p>
          </div>
          <div className="timeline-step">
            <div className="timeline-dot" />
            <p className="timeline-step__title">Técnico asignado</p>
            <p className="timeline-step__time">09:30 hs</p>
          </div>
          <div className="timeline-step">
            <div className="timeline-dot" />
            <p className="timeline-step__title">En camino</p>
            <p className="timeline-step__time text-primary font-bold">Llegada estimada: 10:15 hs</p>
          </div>
          <div className="timeline-step">
            <div className="timeline-dot pending" />
            <p className="timeline-step__title text-muted">Trabajo en curso</p>
          </div>
        </div>
      </section>

      {/* Stitch Recent History Section */}
      <section className="customer-history-section" aria-label="Historial de órdenes">
        <div className="flex justify-between items-center mb-3">
          <h3 className="customer-section-title">Historial de Órdenes</h3>
          <a href="/requests" className="text-primary font-bold text-sm">
            Ver mis solicitudes
          </a>
        </div>
        <div className="customer-history-card">
          <div className="customer-history-card__left">
            <div className="customer-history-card__icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                bolt
              </span>
            </div>
            <div>
              <strong className="block text-sm">Chequeo Eléctrico</strong>
              <span className="text-xs text-muted">12 de Oct, 2023</span>
            </div>
          </div>
          <div className="text-right">
            <strong className="block text-sm">ARS 50.000</strong>
            <span className="text-xs text-success font-semibold">Completado</span>
          </div>
        </div>
      </section>

      {session ? (
        <>
          <section id="profile" className="session-card" aria-label="Perfil y sesión">
            <p className="session-card__label">Perfil cliente</p>
            <p className="session-action">
              <a href={logoutHref}>Cerrar sesión</a>
            </p>
          </section>
          <section className="customer-home-actions" aria-label="Acciones principales">
            <p className="customer-hero__badge">Todo en un solo lugar</p>
            <h2>¿Qué necesitás hacer?</h2>
            <p>Creá una solicitud nueva o revisá el estado de las que ya tenés.</p>
            <div className="customer-home-actions__links">
              <a className="button button--primary" href="/requests/new">
                Nueva solicitud
              </a>
              <a className="button" href="/requests">
                Ver mis solicitudes
              </a>
            </div>
          </section>
        </>
      ) : (
        <section id="profile" className="auth-card" aria-label="Acceso al portal y perfil">
          <h2>¿Ya tenés una solicitud?</h2>
          <p>
            Ingresá con el código que te enviamos por email para crear o seguir tus solicitudes.
          </p>
          <a className="button button--primary" href="/auth/login/email">
            Ingresar con código por email
          </a>
        </section>
      )}
    </ProductShell>
  );
}
