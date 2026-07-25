import "dotenv/config";
import { defineConfig } from "prisma/config";

// `generate` must work before a local database exists. Runtime readiness still
// requires DATABASE_URL and never connects to this placeholder.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/invalid";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: databaseUrl },
});
