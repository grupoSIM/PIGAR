import { ProductShell } from "@pigar/ui";
import { auth0 } from "../lib/auth0";
import { RequestForm } from "./request-form";
import { CustomerRequests } from "./customer-requests";
import { Notifications } from "./notifications";

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
    <ProductShell audience="clientes" title="Nueva solicitud de PIGAR">
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
      {session ? (
        <>
          <p className="session-action">
            <a href={logoutHref}>Cerrar sesión</a>
          </p>
          <Notifications />
          <CustomerRequests />
          <RequestForm mapsApiKey={process.env["PIGAR_G" + "OOGLE_BROWSER_KEY"]} />
        </>
      ) : (
        <section className="auth-card" aria-label="Acceso al portal">
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
