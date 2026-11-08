import { defineConfig, devices } from "@playwright/test";

// The one end-to-end test runs against a real local server and the real database, so it needs
// .env.local and the Supabase anonymous sign-in setting. That is why CI does not run it.
export default defineConfig({
  testDir: "./e2e",
  // Named *.e2e.ts so Vitest does not pick the file up as a unit test.
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    permissions: ["clipboard-read", "clipboard-write"],
    // A phone-sized screen, because the money screens are built phone-first.
    ...devices["Pixel 7"],
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/demo",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
