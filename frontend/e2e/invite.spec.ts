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

test.describe("Invite user flow", () => {
  test("opens the invite modal from the user menu", async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
    await expect(page.getByRole("banner")).toBeVisible();

    await page.getByRole("button", { name: /menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: /convidar usuário/i }).click();

    await expect(
      page.getByRole("dialog", { name: /Convidar usuário/i }),
    ).toBeVisible();
  });

  test("creates a new user and shows the success state", async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
    await expect(page.getByRole("banner")).toBeVisible();

    await page.getByRole("button", { name: /menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: /convidar usuário/i }).click();

    const dialog = page.getByRole("dialog", { name: /Convidar usuário/i });
    await dialog.getByLabel(/^email$/i).fill("maria@empresa.com");
    await dialog.getByLabel(/nome/i).fill("Maria Silva");
    await dialog.getByLabel(/senha temporária/i).fill("strongPass123");
    await dialog.getByRole("button", { name: /criar usuário/i }).click();

    await expect(dialog.getByText("Usuário criado")).toBeVisible();
    await expect(dialog.getByText("Maria Silva")).toBeVisible();
    await expect(dialog.getByText("maria@empresa.com")).toBeVisible();
  });

  test("rejects a too-short password client-side", async ({ page }) => {
    await mockBackend(page);
    await seedSession(page);
    await expect(page.getByRole("banner")).toBeVisible();

    await page.getByRole("button", { name: /menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: /convidar usuário/i }).click();

    const dialog = page.getByRole("dialog", { name: /Convidar usuário/i });
    await dialog.getByLabel(/^email$/i).fill("a@b.co");
    await dialog.getByLabel(/senha temporária/i).fill("short");
    await dialog.getByRole("button", { name: /criar usuário/i }).click();

    await expect(dialog.getByRole("alert")).toContainText(/8 caracteres/i);
  });

  test("surfaces the server's duplicate-email error", async ({ page }) => {
    await mockBackend(page, { registerShouldConflict: true });
    await seedSession(page);

    await page.getByRole("button", { name: /menu do usuário/i }).click();
    await page.getByRole("menuitem", { name: /convidar usuário/i }).click();

    const dialog = page.getByRole("dialog", { name: /Convidar usuário/i });
    await dialog.getByLabel(/^email$/i).fill("duplicate@empresa.com");
    await dialog.getByLabel(/senha temporária/i).fill("validPassword");
    await dialog.getByRole("button", { name: /criar usuário/i }).click();

    await expect(dialog.getByRole("alert")).toContainText(/já cadastrado/i);
  });
});
