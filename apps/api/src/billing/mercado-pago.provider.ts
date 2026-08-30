import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { loadApiConfiguration } from "@pigar/config";
import type { PaymentProvider, ProviderPayment } from "./billing.service.js";
import { PaymentProviderFailure } from "./payment-provider.error.js";

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly token = loadApiConfiguration(process.env).mercadoPago?.accessToken;
  private readonly returnBaseUrl = loadApiConfiguration(process.env).mercadoPago?.returnBaseUrl;
  private readonly checkoutHosts =
    loadApiConfiguration(process.env).mercadoPago?.checkoutHosts ?? [];
  private readonly requestTimeoutMs =
    loadApiConfiguration(process.env).mercadoPago?.requestTimeoutMs ?? 10_000;
  private readonly baseUrl = "https://api.mercadopago.com";

  async createPreference(input: {
    title: string;
    externalReference: string;
    amount: string;
    currency: "ARS";
  }) {
    if (!this.returnBaseUrl)
      throw new PaymentProviderFailure("not_created", "PAYMENT_PROVIDER_UNAVAILABLE");
    const body = await this.request("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            title: input.title,
            quantity: 1,
            currency_id: input.currency,
            unit_price: Number(input.amount),
          },
        ],
        external_reference: input.externalReference,
        notification_url: `${this.returnBaseUrl}/api/v1/webhooks/mercado-pago`,
        back_urls: {
          success: `${this.returnBaseUrl}/payment/success`,
          pending: `${this.returnBaseUrl}/payment/pending`,
          failure: `${this.returnBaseUrl}/payment/failure`,
        },
      }),
    });
    const initPoint =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).init_point
        : undefined;
    return { checkoutUrl: this.checkoutUrl(initPoint) };
  }
  async getPayment(id: string): Promise<ProviderPayment> {
    return this.payment(await this.request(`/v1/payments/${encodeURIComponent(id)}`));
  }
  async searchPayments(reference: string): Promise<ProviderPayment[]> {
    const response = await this.request(
      `/v1/payments/search?external_reference=${encodeURIComponent(reference)}`,
    );
    if (!response || typeof response !== "object" || Array.isArray(response)) return [];
    const results = (response as Record<string, unknown>).results;
    return Array.isArray(results) ? results.map((item) => this.payment(item)) : [];
  }
  async findPreference(reference: string): Promise<{ checkoutUrl: string } | undefined> {
    const response = await this.request(
      `/checkout/preferences/search?external_reference=${encodeURIComponent(reference)}`,
    );
    if (!response || typeof response !== "object" || Array.isArray(response)) return undefined;
    const result = (response as Record<string, unknown>).results;
    if (
      !Array.isArray(result) ||
      result.length !== 1 ||
      !result[0] ||
      typeof result[0] !== "object"
    )
      return undefined;
    const point = (result[0] as Record<string, unknown>).init_point;
    return { checkoutUrl: this.checkoutUrl(point) };
  }
  private async request(path: string, init?: RequestInit): Promise<unknown> {
    if (!this.token)
      throw new PaymentProviderFailure("not_created", "PAYMENT_PROVIDER_UNAVAILABLE");
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
    } catch {
      throw new PaymentProviderFailure("unknown", "PAYMENT_PROVIDER_UNAVAILABLE");
    }
    if (!response.ok) {
      const certainNotCreated =
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429;
      throw new PaymentProviderFailure(
        certainNotCreated ? "not_created" : "unknown",
        certainNotCreated ? "PAYMENT_PROVIDER_REJECTED" : "PAYMENT_PROVIDER_UNAVAILABLE",
      );
    }
    try {
      return await response.json();
    } catch {
      throw new PaymentProviderFailure("unknown", "PAYMENT_PROVIDER_UNAVAILABLE");
    }
  }
  private checkoutUrl(value: unknown): string {
    if (typeof value !== "string") throw new ServiceUnavailableException("CHECKOUT_URL_INVALID");
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new ServiceUnavailableException("CHECKOUT_URL_INVALID");
    }
    if (parsed.protocol !== "https:" || !this.checkoutHosts.includes(parsed.hostname.toLowerCase()))
      throw new ServiceUnavailableException("CHECKOUT_URL_INVALID");
    return parsed.toString();
  }
  private payment(value: unknown): ProviderPayment {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new ServiceUnavailableException("PAYMENT_RESPONSE_INVALID");
    const item = value as Record<string, unknown>;
    if (
      (typeof item.id !== "number" && typeof item.id !== "string") ||
      typeof item.external_reference !== "string" ||
      typeof item.currency_id !== "string" ||
      typeof item.transaction_amount !== "number"
    )
      throw new ServiceUnavailableException("PAYMENT_RESPONSE_INVALID");
    const status =
      item.status === "in_process" || item.status === "authorized"
        ? "pending"
        : item.status;
    if (
      status !== "approved" &&
      status !== "pending" &&
      status !== "rejected" &&
      status !== "cancelled"
    )
      throw new ServiceUnavailableException("PAYMENT_STATUS_UNSUPPORTED");
    return {
      id: String(item.id),
      status,
      externalReference: item.external_reference,
      currency: item.currency_id,
      amount: item.transaction_amount.toFixed(2),
    };
  }
}
