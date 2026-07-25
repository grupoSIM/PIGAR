import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DatabaseService } from "./database.service.js";
import { HealthService } from "./health.service.js";

@Module({
  controllers: [HealthController],
  providers: [DatabaseService, HealthService],
})
export class AppModule {}
