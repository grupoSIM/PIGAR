import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database.service.js";

export type CatalogRateInput = {
  amount: string;
  categoryId: string;
  currency: "ARS";
  validFrom: Date;
  validUntil?: Date;
  zoneId: string;
};

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  async publicOffers(at = new Date()) {
    const zone = await this.database.coverageZone.findFirst({ where: { status: "ACTIVE" } });
    if (!zone) return { items: [] };
    const rates = await this.database.serviceRate.findMany({
      where: {
        zoneId: zone.id,
        status: "PUBLISHED",
        validFrom: { lte: at },
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gt: at } }] }],
        category: { status: "PUBLISHED" },
      },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { version: "desc" }],
    });
    return {
      items: rates.map((rate) => ({
        category: {
          description: rate.category.description,
          id: rate.category.id,
          name: rate.category.name,
          scope: rate.category.scopeDescription,
        },
        currency: rate.currency,
        price: rate.amount.toFixed(2),
        version: rate.version,
      })),
    };
  }

  async operationalCatalog() {
    return this.database.serviceCategory.findMany({
      include: { rates: { include: { zone: true }, orderBy: { version: "desc" } } },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(input: { description: string; name: string; scopeDescription: string }) {
    return this.database.serviceCategory.create({ data: input });
  }

  async updateCategory(
    id: string,
    input: Partial<{ description: string; name: string; scopeDescription: string }>,
  ) {
    return this.database.serviceCategory.update({ where: { id }, data: input });
  }

  async setCategoryStatus(id: string, status: "PUBLISHED" | "RETIRED") {
    return this.database.serviceCategory.update({ where: { id }, data: { status } });
  }

  async createZone(name: string) {
    return this.database.coverageZone.create({ data: { name } });
  }

  async activateZone(id: string) {
    const [zone, activeZone] = await Promise.all([
      this.database.coverageZone.findUnique({ where: { id } }),
      this.database.coverageZone.findFirst({ where: { status: "ACTIVE" } }),
    ]);
    if (!zone) throw new NotFoundException();
    if (activeZone && activeZone.id !== id) throw new ConflictException("SINGLE_ACTIVE_ZONE");
    return this.database.coverageZone.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  async createRate(input: CatalogRateInput) {
    await this.requireCategoryAndZone(input.categoryId, input.zoneId);
    const version = await this.database.serviceRate.aggregate({
      where: { categoryId: input.categoryId, zoneId: input.zoneId },
      _max: { version: true },
    });
    return this.database.serviceRate.create({
      data: { ...input, version: (version._max.version ?? 0) + 1 },
    });
  }

  async publishRate(id: string) {
    const rate = await this.database.serviceRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException();
    await this.requireCategoryAndZone(rate.categoryId, rate.zoneId);
    if (rate.currency !== "ARS" || rate.amount.lessThanOrEqualTo(0)) throw new ConflictException();
    try {
      return await this.database.serviceRate.update({
        where: { id },
        data: { status: "PUBLISHED" },
      });
    } catch (error) {
      if (isCatalogConstraint(error)) throw new ConflictException("RATE_VALIDITY_OVERLAP");
      throw error;
    }
  }

  async retireRate(id: string) {
    return this.database.serviceRate.update({ where: { id }, data: { status: "RETIRED" } });
  }

  private async requireCategoryAndZone(categoryId: string, zoneId: string) {
    const [category, zone] = await Promise.all([
      this.database.serviceCategory.findUnique({ where: { id: categoryId } }),
      this.database.coverageZone.findUnique({ where: { id: zoneId } }),
    ]);
    if (!category || !zone) throw new NotFoundException();
  }
}

function isCatalogConstraint(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error.code === "P2002" || error.code === "P2004") as boolean)
  );
}
