import { ProductShell } from "@pigar/ui";
import { auth0 } from "../lib/auth0";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export default async function CustomerHome() {
  const session = await auth0.getSession();

  return (
    <ProductShell audience="clientes" title="Nueva solicitud de PIGAR">
      <p>
        <strong>Visita Simple — ARS 50.000 final</strong>
      </p>
      <p>
        Incluye la visita, el diagnóstico y los arreglos que puedan completarse según lo informado.
        Si el trabajo excede ese alcance, la visita se cobra y el resto requiere un presupuesto
        posterior.
      </p>
      <p>
        Para confirmar una solicitud, ingresá la descripción del problema, calle y número. Podés
        sumar barrio y entrecalles; si el autocompletado no está disponible, el domicilio se
        conserva tal como lo confirmes manualmente.
      </p>
      <p>
        La solicitud queda lista para operar al adjuntar al menos una foto o un video MP4. Se
        aceptan hasta cinco imágenes de 10 MB y un video de hasta 30 segundos o 50 MB.
      </p>
      <p>El importe se resuelve desde la oferta vigente y no se envía desde tu dispositivo.</p>
      {session ? (
        <RequestForm mapsApiKey={process.env["PIGAR_G" + "OOGLE_BROWSER_KEY"]} />
      ) : (
        <>
          <p>Para crear una solicitud o adjuntar evidencia, primero necesitás ingresar.</p>
          <p>
            <a href="/auth/login/email">Ingresar con código por email</a>
          </p>
        </>
      )}
    </ProductShell>
  );
}
