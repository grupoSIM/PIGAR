import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { loadWorkerConfiguration } from "@pigar/config";
import { createLogger } from "@pigar/observability";
import { DatabaseService } from "../database.service.js";
import { BillingService } from "./billing.service.js";
import { PaymentProviderFailure } from "./payment-provider.error.js";

const JOB_TYPE = "mercado-pago-payment-reconciliation";

/** Ejecuta trabajos persistidos; no conserva payload, secretos ni respuestas del proveedor. */
@Injectable()
export class PaymentReconciliationRunner implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private readonly logger = createLogger({
    environment: process.env.NODE_ENV ?? "development",
    service: "api-payment-reconciliation",
  });

  constructor(
    private readonly database: DatabaseService,
    private readonly billing: BillingService,
  ) {}

  onModuleInit(): void {
    const { pollIntervalMs } = loadWorkerConfiguration(process.env);
    this.logger.info("payment.reconciliation.started", undefined, {
      code: "RUNNER_STARTED",
      duration_ms: 0,
    });
    void this.poll();
    this.timer = setInterval(() => void this.poll(), pollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    const now = new Date();
    try {
      const job = await this.database.claimedJob.findFirst({
        where: { jobType: JOB_TYPE, state: "PENDING", availableAt: { lte: now } },
        orderBy: { availableAt: "asc" },
      });
      if (!job) {
        await this.billing.reconcilePending();
        return;
      }
      const claimed = await this.database.claimedJob.updateMany({
        where: { id: job.id, state: "PENDING" },
        data: { state: "PROCESSING", leaseExpiresAt: new Date(now.getTime() + 60_000) },
      });
      if (claimed.count !== 1) return;
      try {
        await this.billing.reconcileProviderPaymentId(job.idempotencyKey);
        await this.database.claimedJob.update({
          where: { id: job.id },
          data: { state: "PROCESSED", leaseExpiresAt: null, lastSafeError: null },
        });
      } catch (error) {
        const attempts = job.attempts + 1;
        const cappedExponent = Math.min(attempts, 8);
        const backoffMs = Math.min(15 * 60_000, 1_000 * 2 ** cappedExponent);
        const jitterMs = Math.floor(Math.random() * 1_000);
        const safeError =
          error instanceof PaymentProviderFailure
            ? error.safeCode
            : "provider_or_reconciliation_failure";
        await this.database.claimedJob.update({
          where: { id: job.id },
          data: {
            state: "PENDING",
            attempts,
            availableAt: new Date(now.getTime() + backoffMs + jitterMs),
            leaseExpiresAt: null,
            lastSafeError: safeError,
          },
        });
        this.logger.warn("payment.reconciliation.retry_scheduled", undefined, {
          code: safeError,
          duration_ms: 0,
        });
      }
    } catch {
      this.logger.warn("payment.reconciliation.poll_failed", undefined, {
        code: "POLL_FAILED",
        duration_ms: 0,
      });
    }
  }
}
