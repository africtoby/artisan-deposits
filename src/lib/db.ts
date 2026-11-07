import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

// In development, hot reload re-runs this file. Keeping the client on globalThis stops every
// reload from opening a new set of database connections.
const holder = globalThis as typeof globalThis & { __db?: PrismaClient };

// Supabase signs its database certificates with its own authority, which Node does not trust by
// default. Certificate checking stays ON; we hand it the authority's public certificate instead.
// The connection is split into parts (rather than passed as a string) so a `sslmode=` in the
// string cannot quietly switch verification off.
function poolConfig(connectionString: string) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: {
      ca: readFileSync(resolve(process.cwd(), "certs/supabase-ca.crt"), "utf8"),
      rejectUnauthorized: true,
    },
  };
}

// A function, not a top-level constant, so importing this file never needs a database.
export function getDb(): PrismaClient {
  holder.__db ??= new PrismaClient({
    adapter: new PrismaPg(poolConfig(getServerEnv().DATABASE_URL)),
  });
  return holder.__db;
}
