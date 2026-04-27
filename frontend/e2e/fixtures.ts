import { test as base, type Page } from "@playwright/test";

/**
 * Shared fixtures + API mocks for the Contact Pro Inbox E2E suite.
 *
 * The frontend talks to the backend via `${VITE_API_URL}/api/...` and
 * Socket.IO. For deterministic browser tests we intercept the HTTP traffic
 * with `page.route`. Socket.IO handshake is not required — the UI doesn't
 * crash when the socket fails to connect, it just stays in 'connecting'.
 */
export const SAMPLE_USER = {
  id: "user_demo",
  email: "demo@contactpro.local",
  name: "Demo Owner",
  role: "owner",
  workspace: { id: "ws_default", slug: "default", name: "Default Workspace" },
};

export const SAMPLE_TOKEN = "fake.jwt.token";

export const SAMPLE_CONVERSATIONS = [
  {
    id: "conv_1",
    workspaceId: "ws_default",
    whatsappJid: "5511999990001@s.whatsapp.net",
    contactName: "Marcelo Test",
    status: "qualified",
    intent: "contact_z",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lead: {
      id: "lead_1",
      conversationId: "conv_1",
      name: "Marcelo Test",
      company: "Acme",
      phone: "5511999990001",
      serviceInterest: "contact_z",
      leadGoal: "automatizar atendimento",
      estimatedVolume: "10 mil/mês",
      status: "qualified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    messages: [
      {
        id: "msg_1",
        conversationId: "conv_1",
        whatsappId: "wa1",
        direction: "inbound",
        type: "text",
        content: "Olá, quero saber sobre o Contact Z",
        mediaPath: null,
        transcription: null,
        status: "delivered",
        reaction: "✅",
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

export const SAMPLE_MESSAGES = [
  {
    id: "msg_1",
    conversationId: "conv_1",
    whatsappId: "wa1",
    direction: "inbound",
    type: "text",
    content: "Olá, quero saber sobre o Contact Z",
    mediaPath: null,
    transcription: null,
    status: "delivered",
    reaction: "✅",
    createdAt: new Date().toISOString(),
  },
  {
    id: "msg_2",
    conversationId: "conv_1",
    whatsappId: "wa2",
    direction: "outbound",
    type: "text",
    content: "Olá! Que bom que tem interesse no Contact Z. Você pode me contar um pouco mais?",
    mediaPath: null,
    transcription: null,
    status: "sent",
    reaction: null,
    createdAt: new Date().toISOString(),
  },
];

interface MockOptions {
  loginShouldFail?: boolean;
}

/**
 * Installs HTTP route mocks. Call from each test that needs the API to
 * respond — no implicit setup at fixture level so individual tests can
 * customise behaviour (e.g. force login failure).
 */
export const mockBackend = async (page: Page, opts: MockOptions = {}) => {
  await page.route("**/api/auth/login", async (route, request) => {
    if (opts.loginShouldFail) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email ou senha inválidos" }),
      });
      return;
    }
    const body = request.postDataJSON() as { email: string; password: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: SAMPLE_TOKEN,
        user: { ...SAMPLE_USER, email: body.email },
      }),
    });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SAMPLE_USER),
    });
  });

  await page.route("**/api/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspaceId: "ws_default",
        whatsapp: { status: "connected", qr: null },
        services: { ai: true, stt: true, tts: true, queue: true },
      }),
    });
  });

  await page.route("**/api/conversations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SAMPLE_CONVERSATIONS),
    });
  });

  await page.route("**/api/conversations/*/messages", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SAMPLE_MESSAGES),
    });
  });
};

export const test = base.extend({
  page: async ({ page }, use) => {
    // Avoid Playwright failing on noise from the (un-mocked) Socket.IO endpoint.
    await page.route("**/socket.io/**", async (route) => {
      await route.fulfill({ status: 200, body: "" });
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
