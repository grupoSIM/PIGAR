import { ProductShell } from "@pigar/ui";

export default function AdminHome() {
  return (
    <ProductShell audience="administración" title="Bandeja operativa de PIGAR">
      <p>
        El backoffice está en preparación. La primera entrega operativa comenzará en la bandeja de
        solicitudes y órdenes, sin dashboard de KPIs.
      </p>
      <p>
        <a href="/admin/login">Iniciar sesión</a>
      </p>
    </ProductShell>
  );
}
