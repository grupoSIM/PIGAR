import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type ProviderPaymentStatus = "approved" | "cancelled" | "pending" | "rejected";
export type PaymentPocStatus = Uppercase<ProviderPaymentStatus>;

export type PaymentWebhook = {
  eventId: string;
  paymentId: string;
  type: "payment";
};

export type PaymentProviderPort = {
  getPayment(paymentId: string): Promise<{ id: string; status: ProviderPaymentStatus }>;
};

export type PaymentPocStore = {
  claimEvent(receipt: { eventIdHash: string; eventType: string }): Promise<boolean>;
  recordInvalidEvent(receipt: { eventIdHash: string; eventType: string }): Promise<void>;
  savePayment(payment: {
    paymentId: string;
    paymentIdHash: string;
    status: PaymentPocStatus;
  }): Promise<void>;
  pendingPaymentHashes(): Promise<string[]>;
  paymentStatus(paymentIdHash: string): PaymentPocStatus | undefined;
  paymentIdForReconciliation?(paymentIdHash: string): string | undefined;
};

export type PaymentPocResult =
  | { outcome: "INVALID_SIGNATURE" | "DUPLICATE" | "UNRESOLVED" }
  | { outcome: "APPLIED"; status: PaymentPocStatus };

/**
 * PoC interna: no expone endpoints ni acepta retornos del navegador. Solo una
 * consulta autenticada al proveedor puede convertir el resultado en APPROVED.
 */
export class PaymentPocService {
  constructor(
    private readonly provider: PaymentProviderPort,
    private readonly store: PaymentPocStore,
    private readonly webhookSecret: string,
  ) {}

  async processWebhook(event: PaymentWebhook, signature: string): Promise<PaymentPocResult> {
    const eventIdHash = hashIdentifier(event.eventId);
    if (!this.isValidEvent(event) || !this.hasValidSignature(event, signature)) {
      await this.store.recordInvalidEvent({ eventIdHash, eventType: event.type });
      return { outcome: "INVALID_SIGNATURE" };
    }

    if (!(await this.store.claimEvent({ eventIdHash, eventType: event.type }))) {
      return { outcome: "DUPLICATE" };
    }

    return this.queryAndSave(event.paymentId);
  }

  async reconcilePending(): Promise<number> {
    let reconciled = 0;
    for (const paymentIdHash of await this.store.pendingPaymentHashes()) {
      // El hash no se puede volver a consultar. En producción, el adaptador
      // persistirá un identificador cifrado/recuperable fuera de los logs.
      const paymentId = this.store.paymentIdForReconciliation?.(paymentIdHash);
      if (!paymentId) continue;
      const result = await this.queryAndSave(paymentId);
      if (result.outcome === "APPLIED") reconciled += 1;
    }
    return reconciled;
  }

  private async queryAndSave(paymentId: string): Promise<PaymentPocResult> {
    try {
      const payment = await this.provider.getPayment(paymentId);
      if (payment.id !== paymentId) return { outcome: "UNRESOLVED" };

      const status = payment.status.toUpperCase() as PaymentPocStatus;
      await this.store.savePayment({ paymentId, paymentIdHash: hashIdentifier(paymentId), status });
      return { outcome: "APPLIED", status };
    } catch {
      return { outcome: "UNRESOLVED" };
    }
  }

  private hasValidSignature(event: PaymentWebhook, signature: string): boolean {
    const expected = signWebhook(event, this.webhookSecret);
    const actualBytes = Buffer.from(signature, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    return (
      actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
    );
  }

  private isValidEvent(event: PaymentWebhook): boolean {
    return (
      event.type === "payment" &&
      /^[a-zA-Z0-9_-]{1,100}$/.test(event.eventId) &&
      /^[a-zA-Z0-9_-]{1,100}$/.test(event.paymentId)
    );
  }
}

export class InMemoryPaymentPocStore implements PaymentPocStore {
  private readonly events = new Map<string, "VALID" | "INVALID">();
  private readonly payments = new Map<string, { paymentId: string; status: PaymentPocStatus }>();

  async claimEvent(receipt: { eventIdHash: string }): Promise<boolean> {
    if (this.events.has(receipt.eventIdHash)) return false;
    this.events.set(receipt.eventIdHash, "VALID");
    return true;
  }

  async recordInvalidEvent(receipt: { eventIdHash: string }): Promise<void> {
    this.events.set(receipt.eventIdHash, "INVALID");
  }

  async savePayment(payment: {
    paymentId: string;
    paymentIdHash: string;
    status: PaymentPocStatus;
  }): Promise<void> {
    const previous = this.payments.get(payment.paymentIdHash);
    if (!previous || paymentRank(payment.status) >= paymentRank(previous.status)) {
      this.payments.set(payment.paymentIdHash, {
        paymentId: previous?.paymentId ?? payment.paymentId,
        status: payment.status,
      });
    }
  }

  async pendingPaymentHashes(): Promise<string[]> {
    return [...this.payments]
      .filter(([, payment]) => payment.status === "PENDING")
      .map(([hash]) => hash);
  }

  paymentStatus(paymentIdHash: string): PaymentPocStatus | undefined {
    return this.payments.get(paymentIdHash)?.status;
  }

  paymentIdForReconciliation(paymentIdHash: string): string | undefined {
    return this.payments.get(paymentIdHash)?.paymentId;
  }

  seedPending(paymentId: string): void {
    const paymentIdHash = hashIdentifier(paymentId);
    this.payments.set(paymentIdHash, { paymentId, status: "PENDING" });
  }
}

export function signWebhook(event: PaymentWebhook, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${event.eventId}.${event.paymentId}.${event.type}`)
    .digest("hex");
}

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function paymentRank(status: PaymentPocStatus): number {
  return status === "APPROVED" ? 3 : status === "REJECTED" || status === "CANCELLED" ? 2 : 1;
}
