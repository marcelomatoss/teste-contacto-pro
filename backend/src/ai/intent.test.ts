import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM JSON helper before importing intent.ts so the module picks up
// the mocked version.
vi.mock("./llm.js", () => ({
  askLLMForJSON: vi.fn(),
}));

import { classifyIntent, INTENT_VALUES } from "./intent.js";
import { askLLMForJSON } from "./llm.js";

describe("classifyIntent", () => {
  beforeEach(() => {
    vi.mocked(askLLMForJSON).mockReset();
  });

  it("returns the intent value when LLM responds with a known category", async () => {
    vi.mocked(askLLMForJSON).mockResolvedValueOnce({
      intent: "mailing",
      confidence: 0.9,
    });
    const intent = await classifyIntent([], "preciso comprar mailing");
    expect(intent).toBe("mailing");
  });

  it("falls back to general_question when LLM returns null", async () => {
    vi.mocked(askLLMForJSON).mockResolvedValueOnce(null);
    const intent = await classifyIntent([], "qualquer texto");
    expect(intent).toBe("general_question");
  });

  it("falls back to general_question when LLM returns an unknown category", async () => {
    vi.mocked(askLLMForJSON).mockResolvedValueOnce({
      intent: "marketing-bullshit" as never,
      confidence: 0.8,
    });
    const intent = await classifyIntent([], "x");
    expect(intent).toBe("general_question");
  });

  it("exports exactly the 9 documented intents", () => {
    expect(INTENT_VALUES).toEqual([
      "contact_z",
      "contact_tel",
      "mailing",
      "data_enrichment",
      "pricing",
      "human_handoff",
      "opt_out",
      "support",
      "general_question",
    ]);
  });
});
