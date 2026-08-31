export const NOTIFICATION_TEMPLATES = {
  "work_order.assignment_changed": {
    type: "WORK_ORDER_ASSIGNMENT_CHANGED",
    key: "assignment-changed",
    title: "Técnico asignado",
    summary: "Tu solicitud tiene una asignación actualizada.",
  },
  "work_order.en_route": {
    type: "WORK_ORDER_EN_ROUTE",
    key: "technician-en-route",
    title: "Técnico en camino",
    summary: "La atención de tu solicitud está en camino.",
  },
  "work_order.cancelled": {
    type: "WORK_ORDER_CANCELLED",
    key: "request-cancelled",
    title: "Solicitud cancelada",
    summary: "Tu solicitud fue cancelada.",
  },
  "payment.approved": {
    type: "PAYMENT_APPROVED",
    key: "payment-approved",
    title: "Pago confirmado",
    summary: "Tu pago fue confirmado.",
  },
  "payment.rejected": {
    type: "PAYMENT_REJECTED",
    key: "payment-rejected",
    title: "Pago rechazado",
    summary: "No pudimos confirmar tu pago.",
  },
  "work_order.closed": {
    type: "WORK_ORDER_CLOSED",
    key: "work-order-closed",
    title: "Trabajo cerrado",
    summary: "Tu solicitud fue cerrada.",
  },
} as const;

export type NotificationEventType = keyof typeof NOTIFICATION_TEMPLATES;
export const NOTIFICATION_EVENT_TYPES = Object.keys(
  NOTIFICATION_TEMPLATES,
) as NotificationEventType[];

export function notificationTemplate(eventType: string, version: number) {
  if (version !== 1 || !NOTIFICATION_EVENT_TYPES.includes(eventType as NotificationEventType))
    return undefined;
  return NOTIFICATION_TEMPLATES[eventType as NotificationEventType];
}
