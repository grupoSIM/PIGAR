import { Controller, Get, Headers, Res, ServiceUnavailableException } from "@nestjs/common";
import type { HealthResponse } from "@pigar/contracts";
import { correlationId, createLogger } from "@pigar/observability";
import type { FastifyReply } from "fastify";
import { HealthService } from "./health.service.js";

const logger = createLogger({
  environment: process.env.NODE_ENV ?? "development",
  service: "api",
});

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  live(
    @Headers("x-request-id") requestId: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): HealthResponse {
    const startedAt = Date.now();
    const id = correlationId(requestId);
    const response = this.healthService.live();
    reply.header("x-request-id", id);
    logger.info("health.live", id, { code: "LIVE_OK", duration_ms: Date.now() - startedAt });
    return response;
  }

  @Get("ready")
  async ready(
    @Headers("x-request-id") requestId: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<HealthResponse> {
    const startedAt = Date.now();
    const id = correlationId(requestId);
    reply.header("x-request-id", id);
    const response = await this.healthService.ready();
    if (!response) {
      reply.type("application/problem+json");
      logger.warn("health.ready", id, {
        code: "SERVICE_NOT_READY",
        duration_ms: Date.now() - startedAt,
      });
      throw new ServiceUnavailableException({
        code: "SERVICE_NOT_READY",
        status: 503,
        title: "Servicio no disponible",
        type: "https://pigar.local/problems/service-not-ready",
      });
    }
    logger.info("health.ready", id, { code: "READY_OK", duration_ms: Date.now() - startedAt });
    return response;
  }
}
