import { ProductShell } from "@pigar/ui";
import { OperationalRequests } from "./operational-requests";
import { auth0 } from "../lib/auth0";

export default async function AdminHome() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();
  const configuredBaseUrl =
    process.env.PIGAR_ADMIN_AUTH0_APP_BASE_URL ??
    process.env.APP_BASE_URL ??
    "http://localhost:3002";
  const appBaseUrl = configuredBaseUrl.replace(/\/$/, "").replace(/\/admin$/, "");
  const logoutHref = `/admin/auth/logout?returnTo=${encodeURIComponent(`${appBaseUrl}/admin`)}`;

  return (
    <ProductShell audience="administración" title="Bandeja operativa de PIGAR" currentPath="/admin">
      <section className="admin-intro">
        <p>
          ADMIN y DISPATCHER pueden consultar las solicitudes, su domicilio confirmado y los
          adjuntos privados sólo por necesidad operativa. Cada consulta queda auditada sin incluir
          dirección, coordenadas ni nombres de archivos.
        </p>
        <p>
          La oferta inicial es Visita Simple por ARS 50.000 final y queda congelada al crear cada
          solicitud. Desde esta bandeja podés asignar técnicos e informar hitos; no incluye
          tracking.
        </p>
      </section>
      {!session ? (
        <section className="auth-card" aria-label="Acceso administrativo">
          <h2>Acceso interno</h2>
          <p>Ingresá con tu cuenta administrativa y el segundo factor configurado.</p>
          <a className="button button--primary" href="/login">
            Iniciar sesión
          </a>
        </section>
      ) : (
        <>
          <p className="session-action">
            <a href={logoutHref}>Cerrar sesión</a>
          </p>
          <OperationalRequests
            mediaDeliveryOrigin={process.env.PIGAR_MEDIA_DELIVERY_ORIGIN ?? ""}
          />
        </>
      )}
    </ProductShell>
  );
}
