export class PaymentProviderFailure extends Error {
  constructor(
    readonly certainty: "not_created" | "unknown",
    readonly safeCode: "PAYMENT_PROVIDER_REJECTED" | "PAYMENT_PROVIDER_UNAVAILABLE",
  ) {
    super(safeCode);
    this.name = "PaymentProviderFailure";
  }
}
