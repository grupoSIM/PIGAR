import { ProductShell } from "@pigar/ui";

export const dynamic = "force-dynamic";

export default function CustomerHome() {
  const googleConnection = process.env.PIGAR_CUSTOMER_AUTH0_GOOGLE_CONNECTION;

  return (
    <ProductShell audience="clientes" title="Tu asistencia, clara y ordenada">
      <p>
        El portal de clientes de PIGAR está en preparación. Próximamente podrás crear y seguir
        solicitudes de servicio.
      </p>
      {googleConnection ? (
        <p>
          <a href="/auth/login/google">Continuar con Google</a>
        </p>
      ) : null}
      <p>
        <a href="/auth/login/email">Recibir código por email</a>
      </p>
    </ProductShell>
  );
}
