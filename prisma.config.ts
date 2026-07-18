import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // migrate deploy needs a non-pooled connection: Postgres advisory locks
    // (which Prisma uses to serialize migrations) aren't reliable through
    // PgBouncer/Neon's pooled connection. Falls back to DATABASE_URL if
    // DIRECT_URL isn't set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
