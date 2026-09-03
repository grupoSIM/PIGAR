import { ProductShell } from "@pigar/ui";
import { auth0 } from "../../lib/auth0";
import { CustomerRequests } from "../customer-requests";
import { Notifications } from "../notifications";
import { RequestForm } from "../request-form";

export const dynamic = "force-dynamic";

export default async function CustomerRequestsPage() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();
  const logoutHref = "/auth/logout?returnTo=" + encodeURIComponent("/");

  return (
    <ProductShell audience="clientes" title="Mis solicitudes" currentPath="/requests">
      {session ? (
        <>
          <section className="session-card" aria-label="Perfil y sesión">
            <p className="session-card__label">Perfil cliente</p>
            <p className="session-action">
              <a href={logoutHref}>Cerrar sesión</a>
            </p>
          </section>
          <p className="context-backlink">
            <a href="/requests/new">Nueva solicitud</a>
          </p>
          <Notifications />
          <CustomerRequests />
          <RequestForm mapsApiKey={process.env["PIGAR_G" + "OOGLE_BROWSER_KEY"]} />
        </>
      ) : (
        <section className="auth-card" aria-label="Acceso al portal">
          <h2>Ingresá para ver tus solicitudes</h2>
          <a className="button button--primary" href="/auth/login/email">
            Ingresar con código por email
          </a>
        </section>
      )}
    </ProductShell>
  );
}
