import { test, expect, mockBackend, SAMPLE_TOKEN, SAMPLE_USER } from "./fixtures";

test.describe("Inbox UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await page.goto("/");
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem("contactpro:token", token);
        localStorage.setItem("contactpro:user", JSON.stringify(user));
      },
      { token: SAMPLE_TOKEN, user: SAMPLE_USER },
    );
    await page.reload();
  });

  test("renders the 3-pane layout when authenticated", async ({ page }) => {
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Conversas/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Lead$/ })).toBeVisible();
  });

  test("auto-selects the first conversation and shows its messages", async ({ page }) => {
    await expect(page.getByText("Marcelo Test").first()).toBeVisible();
    // Both messages render in the chat pane
    await expect(page.getByText(/Olá, quero saber sobre o Contact Z/).first()).toBeVisible();
    await expect(page.getByText(/Que bom que tem interesse/)).toBeVisible();
  });

  test("lead panel reflects the extracted data + intent", async ({ page }) => {
    // Intent label appears in the lead-panel intent card AND the list badge,
    // so we just need any match.
    await expect(page.getByText(/Contact Z \(WhatsApp\)/).first()).toBeVisible();
    await expect(page.getByText("Acme")).toBeVisible();
    await expect(page.getByText("automatizar atendimento")).toBeVisible();
    await expect(page.getByText("10 mil/mês")).toBeVisible();
  });

  test("shows service indicators (LLM/STT/TTS/QUEUE) as enabled", async ({ page }) => {
    await expect(page.getByLabel(/LLM: configurado/)).toBeVisible();
    await expect(page.getByLabel(/STT: configurado/)).toBeVisible();
    await expect(page.getByLabel(/TTS: configurado/)).toBeVisible();
    await expect(page.getByLabel(/QUEUE: configurado/)).toBeVisible();
  });

  test("conversation status badge appears in the list", async ({ page }) => {
    await expect(page.getByText(/qualificado/i).first()).toBeVisible();
  });

  test("search input filters conversations", async ({ page }) => {
    await page.getByPlaceholder(/buscar/i).fill("nada que combina");
    await expect(page.getByText(/Nenhuma conversa para/)).toBeVisible();
  });
});
