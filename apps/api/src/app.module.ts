import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DatabaseService } from "./database.service.js";
import { HealthService } from "./health.service.js";
import { IdentityGuard } from "./identity/identity.guard.js";
import { AdminProfilesController } from "./identity/admin-profiles.controller.js";
import { Auth0ProvisioningService } from "./identity/auth0-provisioning.service.js";
import { MeController } from "./identity/me.controller.js";

@Module({
  controllers: [HealthController, MeController, AdminProfilesController],
  providers: [DatabaseService, HealthService, IdentityGuard, Auth0ProvisioningService],
})
export class AppModule {}
