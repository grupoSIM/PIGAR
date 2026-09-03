import { ProductShell } from "@pigar/ui";
import { auth0 } from "../../lib/auth0";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const session =
    process.env.PIGAR_E2E_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
      ? { user: {} }
      : await auth0.getSession();
  const logoutHref = "/auth/logout?returnTo=" + encodeURIComponent("/");

  return (
    <ProductShell audience="clientes" title="Perfil" currentPath="/profile">
      <section className="session-card" aria-label="Perfil y sesión">
        <p className="session-card__label">Perfil cliente</p>
        {session ? (
          <p className="session-action">
            <a href={logoutHref}>Cerrar sesión</a>
          </p>
        ) : (
          <>
            <p>Ingresá con el código que te enviamos por email para acceder a tu portal.</p>
            <a className="button button--primary" href="/auth/login/email">
              Ingresar con código por email
            </a>
          </>
        )}
      </section>
    </ProductShell>
  );
}
