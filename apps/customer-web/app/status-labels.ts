const ORDER_STATE_LABELS: Record<string, string> = {
  TECNICO_ASIGNADO: "Técnico asignado",
  EN_CAMINO: "Técnico en camino",
  EN_ATENCION: "Atención en curso",
  TRABAJO_FINALIZADO: "Trabajo finalizado",
  PENDIENTE_PAGO: "Pago pendiente",
  PENDIENTE_CONFORMIDAD: "Pendiente de conformidad",
  CERRADA: "Solicitud cerrada",
  CANCELADA: "Solicitud cancelada",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pago pendiente",
  APROBADO: "Pago aprobado",
  RECHAZADO: "Pago rechazado",
  CANCELADO: "Pago cancelado",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  RESULTADO_NO_ESPERADO: "Resultado no esperado",
  PROBLEMA_REAPARECIO: "El problema reapareció",
  TRABAJO_INCOMPLETO: "Trabajo incompleto",
  DANIO_REPORTADO: "Daño reportado",
  CONSULTA_SOBRE_COBRO: "Consulta sobre cobro",
};

const INCIDENT_STATUS_LABELS: Record<string, string> = {
  ABIERTA: "Abierta",
  EN_TRIAGE: "En revisión",
  CERRADA: "Cerrada",
};

function humanize(value: string): string {
  const words = value.replaceAll("_", " ").toLocaleLowerCase("es-AR");
  return words.charAt(0).toLocaleUpperCase("es-AR") + words.slice(1);
}

export function formatOrderState(value: string): string {
  return ORDER_STATE_LABELS[value] ?? humanize(value);
}

export function formatPaymentStatus(value: string): string {
  return PAYMENT_STATUS_LABELS[value] ?? humanize(value);
}

export function formatIncidentType(value: string): string {
  return INCIDENT_TYPE_LABELS[value] ?? humanize(value);
}

export function formatIncidentStatus(value: string): string {
  return INCIDENT_STATUS_LABELS[value] ?? humanize(value);
}
