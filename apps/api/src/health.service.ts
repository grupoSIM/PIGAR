import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@pigar/contracts";
import { DatabaseService } from "./database.service.js";

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  live(): HealthResponse {
    return this.response();
  }

  async ready(): Promise<HealthResponse | null> {
    return (await this.database.isReachable()) ? this.response() : null;
  }

  private response(): HealthResponse {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
