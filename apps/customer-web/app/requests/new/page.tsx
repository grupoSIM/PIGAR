import { ProductShell } from "@pigar/ui";
import { auth0 } from "../../../lib/auth0";
import { RequestForm } from "../../request-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerRequestPage() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();

  return (
    <ProductShell audience="clientes" title="Nueva solicitud" currentPath="/requests/new">
      <p className="context-backlink">
        <a href="/requests">Volver a mis solicitudes</a>
      </p>
      {session ? (
        <RequestForm mapsApiKey={process.env["PIGAR_G" + "OOGLE_BROWSER_KEY"]} />
      ) : (
        <section className="auth-card" aria-label="Acceso al portal">
          <h2>Ingresá para crear una solicitud</h2>
          <a className="button button--primary" href="/auth/login/email">
            Ingresar con código por email
          </a>
        </section>
      )}
    </ProductShell>
  );
}
