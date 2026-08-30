import { PrismaClient } from "@prisma/client";

/**
 * Prisma client — Vercel-safe.
 *
 * Vercel's serverless functions run on a read-only filesystem except for `/tmp`.
 * The bundled `db/custom.db` cannot be written to at runtime, so seeding fails
 * silently. To fix this, we redirect the SQLite file to `/tmp` when running on
 * Vercel — this gives us a writable location that persists for the lifetime of
 * the serverless container (typically minutes), and re-seeds on every cold start.
 *
 * For true persistence across cold starts, set DATABASE_URL to a managed Postgres
 * (Neon, Supabase, PlanetScale) and change `provider = "postgresql"` in
 * prisma/schema.prisma.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatasourceUrl(): string {
  // On Vercel, ALWAYS use /tmp regardless of what .env says — the project's
  // bundled SQLite file is read-only on Vercel's serverless filesystem.
  if (process.env.VERCEL) {
    return "file:/tmp/triagesetu.db";
  }
  // Honor explicit DATABASE_URL (Postgres in prod, or local SQLite file in dev).
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Local dev fallback — relative path.
  return "file:./db/custom.db";
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    datasourceUrl: resolveDatasourceUrl(),
  });

// Cache on global in dev to avoid exhausting connections during HMR.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
