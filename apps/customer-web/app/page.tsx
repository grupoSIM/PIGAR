import { ProductShell } from "@pigar/ui";

export const dynamic = "force-dynamic";

export default function CustomerHome() {
  return (
    <ProductShell audience="clientes" title="Servicios disponibles de PIGAR">
      <p>
        <strong>Visita Simple — ARS 50.000 final</strong>
      </p>
      <p>
        Incluye la visita, el diagnóstico y los arreglos que puedan completarse según lo informado.
        Si el trabajo excede ese alcance, la visita se cobra y el resto requiere un presupuesto
        posterior.
      </p>
      <p>La disponibilidad final se confirma al crear una solicitud.</p>
      <p>
        <a href="/auth/login/email">Recibir código por email</a>
      </p>
    </ProductShell>
  );
}
