import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env files itself. Node can, and it is fine if the file is absent
// (CI and Vercel provide real environment variables instead).
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local here
}

// Supabase signs its database certificates with its own authority, which is not in the usual
// trust list. We keep certificate checking ON and tell Prisma which authority to trust.
function withSupabaseCa(url: string): string {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("sslmode", "require");
  parsed.searchParams.set("sslcert", resolve("certs/supabase-ca.crt"));
  return parsed.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrations need a direct (or session-pooler) connection; DATABASE_URL is for the running app.
    url: withSupabaseCa(process.env.DIRECT_URL || process.env.DATABASE_URL || ""),
  },
});
