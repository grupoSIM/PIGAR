import { ProductShell } from "@pigar/ui";
import { auth0 } from "../../lib/auth0";
import { OperationalRequests } from "../operational-requests";

export const dynamic = "force-dynamic";

export default async function AdminIncidentsPage() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();

  return (
    <ProductShell audience="administración" title="Incidencias" currentPath="/admin/incidents">
      {session ? (
        <OperationalRequests view="incidents" />
      ) : (
        <section className="auth-card" aria-label="Acceso administrativo">
          <h2>Acceso interno</h2>
          <a className="button button--primary" href="/admin/login">
            Iniciar sesión
          </a>
        </section>
      )}
    </ProductShell>
  );
}
