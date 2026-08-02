import { ProductShell } from "@pigar/ui";

export default function AdminHome() {
  return (
    <ProductShell audience="administración" title="Catálogo operativo de PIGAR">
      <p>
        La administración del catálogo está protegida por rol: sólo ADMIN puede crear, publicar o
        retirar categorías, la zona única y sus tarifas. DISPATCHER puede consultar el catálogo.
      </p>
      <p>
        La oferta inicial es Visita Simple por ARS 50.000 final; los cambios se registran en
        auditoría sin datos personales.
      </p>
      <p>
        <a href="/admin/login">Iniciar sesión</a>
      </p>
    </ProductShell>
  );
}
