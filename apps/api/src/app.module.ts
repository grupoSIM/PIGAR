import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DatabaseService } from "./database.service.js";
import { HealthService } from "./health.service.js";
import { IdentityGuard } from "./identity/identity.guard.js";
import { AdminProfilesController } from "./identity/admin-profiles.controller.js";
import { Auth0ProvisioningService } from "./identity/auth0-provisioning.service.js";
import { MeController } from "./identity/me.controller.js";
import { AdminCatalogController, PublicCatalogController } from "./catalog/catalog.controller.js";
import { CatalogService } from "./catalog/catalog.service.js";
import { AddressNormalizerService } from "./requests/address-normalizer.service.js";
import { RequestMediaService } from "./requests/request-media.service.js";
import { RequestsController } from "./requests/requests.controller.js";
import { RequestsService } from "./requests/requests.service.js";
import { OrdersController } from "./orders/orders.controller.js";
import { OrdersService } from "./orders/orders.service.js";

@Module({
  controllers: [
    HealthController,
    MeController,
    AdminProfilesController,
    PublicCatalogController,
    AdminCatalogController,
    RequestsController,
    OrdersController,
  ],
  providers: [
    DatabaseService,
    HealthService,
    IdentityGuard,
    Auth0ProvisioningService,
    CatalogService,
    AddressNormalizerService,
    RequestMediaService,
    RequestsService,
    OrdersService,
  ],
})
export class AppModule {}
