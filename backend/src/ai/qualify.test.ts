import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./llm.js", () => ({
  askLLMForJSON: vi.fn(),
}));

import { qualifyLead } from "./qualify.js";
import { askLLMForJSON } from "./llm.js";
import type { LeadSnapshot } from "./llm.js";

const emptyLead: LeadSnapshot = {
  name: null,
  company: null,
  phone: null,
  serviceInterest: null,
  leadGoal: null,
  estimatedVolume: null,
  status: "new",
};

describe("qualifyLead", () => {
  beforeEach(() => vi.mocked(askLLMForJSON).mockReset());

  it("forwards the LLM extraction unchanged when valid", async () => {
    const extraction = {
      name: "Marcelo",
      company: "Acme",
      phone: null,
      serviceInterest: "mailing" as const,
      leadGoal: "campanha de cobrança",
      estimatedVolume: "50 mil",
    };
    vi.mocked(askLLMForJSON).mockResolvedValueOnce(extraction);

    const result = await qualifyLead([], "preciso de 50 mil contatos para cobrança", emptyLead);
    expect(result).toEqual(extraction);
  });

  it("returns null when the LLM cannot extract anything", async () => {
    vi.mocked(askLLMForJSON).mockResolvedValueOnce(null);
    const result = await qualifyLead([], "oi", emptyLead);
    expect(result).toBeNull();
  });

  it("passes the current lead snapshot into the prompt for context preservation", async () => {
    vi.mocked(askLLMForJSON).mockResolvedValueOnce({
      name: "Marcelo",
      company: null,
      phone: null,
      serviceInterest: null,
      leadGoal: null,
      estimatedVolume: null,
    });
    await qualifyLead(
      [],
      "meu nome é Marcelo",
      { ...emptyLead, company: "Acme já capturada" },
    );
    const promptArg = vi.mocked(askLLMForJSON).mock.calls[0][0];
    expect(promptArg).toContain("Acme já capturada");
  });
});
