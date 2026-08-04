import { ProductShell } from "@pigar/ui";
import { OperationalRequests } from "./operational-requests";

export default function AdminHome() {
  return (
    <ProductShell audience="administración" title="Bandeja operativa de PIGAR">
      <p>
        ADMIN y DISPATCHER pueden consultar las solicitudes, su domicilio confirmado y los adjuntos
        privados sólo por necesidad operativa. Cada consulta queda auditada sin incluir dirección,
        coordenadas ni nombres de archivos.
      </p>
      <p>
        La oferta inicial es Visita Simple por ARS 50.000 final y queda congelada al crear cada
        solicitud. Esta bandeja no asigna técnicos ni muestra tracking.
      </p>
      <p>
        <a href="/admin/login">Iniciar sesión</a>
      </p>
      <hr />
      <OperationalRequests />
    </ProductShell>
  );
}
