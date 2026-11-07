import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

// In development, hot reload re-runs this file. Keeping the client on globalThis stops every
// reload from opening a new set of database connections.
const holder = globalThis as typeof globalThis & { __db?: PrismaClient };

// A function, not a top-level constant, so importing this file never needs a database.
export function getDb(): PrismaClient {
  holder.__db ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: getServerEnv().DATABASE_URL }),
  });
  return holder.__db;
}
