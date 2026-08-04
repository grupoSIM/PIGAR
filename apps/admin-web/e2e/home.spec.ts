import { test, expect } from "@playwright/test";

test("página principal de admin carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /Bandeja operativa/i })).toBeVisible();
});
