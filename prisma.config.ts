import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env files itself. Node can, and it is fine if the file is absent
// (CI and Vercel provide real environment variables instead).
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local here
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrations need a direct connection; the pooled DATABASE_URL is for the running app.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
