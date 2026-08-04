import { test, expect } from "@playwright/test";

test("página principal carga y muestra PIGAR", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PIGAR/i);
  await expect(page.getByRole("heading", { name: /PIGAR/i })).toBeVisible();
});
