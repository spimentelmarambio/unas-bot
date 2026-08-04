import "dotenv/config";
import { defineConfig } from "prisma/config";

const SCHEMA = "unas_bot";

// The migrate engine resolves unqualified SQL - and its own
// _prisma_migrations bookkeeping - against whatever `?schema=` says, which
// defaults to "public". In this database "public" is Lukas's schema, so a
// connection string that lost the parameter doesn't fail: it quietly
// migrates the *other* project. That happened on 2026-08-03. The build
// reported "All migrations have been successfully applied" while the column
// landed in public.NailTransaction, and the app - which reads
// unas_bot.NailTransaction because of @@schema() - started 500ing with
// P2022 ColumnNotFound.
//
// Pinning it here means a correct migration no longer depends on the env
// var being spelled right in Vercel, and a URL that explicitly asks for a
// different schema fails loudly instead of silently.
function withSchema(url: string | undefined): string | undefined {
  if (!url) return url;
  const current = url.match(/[?&]schema=([^&]*)/);
  if (!current) {
    return `${url}${url.includes("?") ? "&" : "?"}schema=${SCHEMA}`;
  }
  if (current[1] !== SCHEMA) {
    throw new Error(
      `La conexión apunta al schema "${current[1]}" y este proyecto vive en "${SCHEMA}". ` +
        `Migrar así escribiría en el schema equivocado (el de Lukas). Corregí DIRECT_URL/DATABASE_URL.`
    );
  }
  return url;
}

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
    url: withSchema(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
  },
});
