import { ProductShell } from "@pigar/ui";

export default function CustomerHome() {
  return (
    <ProductShell audience="clientes" title="Tu asistencia, clara y ordenada">
      <p>
        El portal de clientes de PIGAR está en preparación. Próximamente podrás crear y seguir
        solicitudes de servicio.
      </p>
      <p>
        <a href="/auth/login/google">Continuar con Google</a>
      </p>
      <p>
        <a href="/auth/login/email">Recibir código por email</a>
      </p>
    </ProductShell>
  );
}
