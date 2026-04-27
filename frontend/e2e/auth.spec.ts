import { test, expect, mockBackend, SAMPLE_TOKEN, SAMPLE_USER } from "./fixtures";

const seedSession = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("contactpro:token", token);
      localStorage.setItem("contactpro:user", JSON.stringify(user));
    },
    { token: SAMPLE_TOKEN, user: SAMPLE_USER },
  );
  await page.reload();
};

test.describe("Auth flow", () => {
  test("shows login page when no session is stored", async ({ page }) => {
    await mockBackend(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /^Entrar$/ })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
  });

  test("rejects wrong credentials with an inline error", async ({ page }) => {
    await mockBackend(page, { loginShouldFail: true });
    await page.goto("/");

    await page.getByLabel(/email/i).fill("admin@contactpro.local");
    await page.getByLabel(/senha/i).fill("wrong");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByRole("alert")).toContainText(/inválid/i);
    await expect(page.getByRole("heading", { name: /^Entrar$/ })).toBeVisible();
  });

  test("logs in and lands on the inbox", async ({ page }) => {
    await mockBackend(page);
    await page.goto("/");

    await page.getByLabel(/email/i).fill("admin@contactpro.local");
    await page.getByLabel(/senha/i).fill("contactpro");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByRole("banner")).toBeVisible();
    // Use a heading-specific lookup so we don't collide with brand text
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Contact Pro");
    // The contact name appears in both the list (h3) and the chat header (h2);
    // we just need either one to be on screen.
    await expect(page.getByText("Marcelo Test").first()).toBeVisible();
  });

  test("session persists across reload", async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText("Marcelo Test").first()).toBeVisible();
  });

  test("user menu lets the user log out and returns to login", async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
    await expect(page.getByRole("banner")).toBeVisible();

    await page.getByRole("button", { name: /menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: /sair/i }).click();

    await expect(page.getByRole("heading", { name: /^Entrar$/ })).toBeVisible();
  });
});
