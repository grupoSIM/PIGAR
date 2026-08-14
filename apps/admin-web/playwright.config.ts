import { defineConfig, devices } from "@playwright/test";

// Usamos el puerto 3001 por defecto para el dev server de admin-web
const PORT = 3001;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --webpack --port 3001 --hostname 127.0.0.1",
    url: baseURL + "/admin",
    reuseExistingServer: !process.env.CI,
    env: {
      PIGAR_E2E_TEST_AUTH: "1",
      PIGAR_MEDIA_DELIVERY_ORIGIN: "http://127.0.0.1:8088",
    },
  },
});
