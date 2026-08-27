import Link from "next/link";

export default async function PaymentReturn({ params }: { params: Promise<{ result: string }> }) {
  const { result } = await params;
  const known = result === "success" || result === "pending" || result === "failure";
  return (
    <main>
      <h1>Estamos verificando el pago</h1>
      <p>
        {known
          ? "El retorno del checkout no confirma el pago. Consultaremos el estado seguro antes de actualizar tu solicitud."
          : "No reconocemos este retorno. Consultá el estado de tu solicitud de forma segura."}
      </p>
      <Link href="/">Volver a mis solicitudes</Link>
    </main>
  );
}
