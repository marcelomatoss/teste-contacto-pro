import { describe, it, expect } from "vitest";
import { decideStatusAndReaction } from "./decideStatus.js";
import type { Intent } from "../ai/intent.js";

describe("decideStatusAndReaction", () => {
  it("flags human handoff regardless of current status", () => {
    expect(decideStatusAndReaction("human_handoff", "new")).toEqual({
      leadStatus: "needs_human",
      conversationStatus: "needs_human",
      reaction: "✅",
    });
    expect(decideStatusAndReaction("human_handoff", "qualified")).toMatchObject({
      leadStatus: "needs_human",
      reaction: "✅",
    });
  });

  it("flags opt-out with thumbs-up emoji", () => {
    expect(decideStatusAndReaction("opt_out", "qualified")).toEqual({
      leadStatus: "opt_out",
      conversationStatus: "opt_out",
      reaction: "👌",
    });
  });

  it.each<Intent>(["contact_z", "contact_tel", "mailing", "data_enrichment"])(
    "qualifies a new lead on service intent: %s",
    (intent) => {
      expect(decideStatusAndReaction(intent, "new")).toEqual({
        leadStatus: "qualified",
        conversationStatus: "active",
        reaction: "✅",
      });
    },
  );

  it("does not downgrade a qualified lead on follow-up service intent", () => {
    expect(decideStatusAndReaction("contact_z", "qualified")).toEqual({
      leadStatus: "qualified",
      conversationStatus: "active",
      reaction: "✅",
    });
  });

  it("uses the default reaction for general questions and pricing", () => {
    expect(decideStatusAndReaction("general_question", "new").reaction).toBe("👍");
    expect(decideStatusAndReaction("pricing", "new").reaction).toBe("👍");
    expect(decideStatusAndReaction("support", "qualified").reaction).toBe("👍");
  });

  it("preserves the current lead status on neutral intents", () => {
    expect(decideStatusAndReaction("general_question", "qualified").leadStatus).toBe(
      "qualified",
    );
    expect(decideStatusAndReaction("pricing", "needs_human").leadStatus).toBe("needs_human");
  });
});
