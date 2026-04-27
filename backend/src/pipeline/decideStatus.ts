import type { Intent } from "../ai/intent.js";

export interface StatusDecision {
  leadStatus: "new" | "qualified" | "needs_human" | "opt_out";
  conversationStatus: "active" | "needs_human" | "opt_out";
  reaction: "👍" | "✅" | "👌" | "⚠️";
}

/**
 * Pure function: maps an inbound intent + current lead status into the new
 * (leadStatus, conversationStatus, reaction) triple.
 *
 * Extracted from the inbound pipeline so it is unit-testable without spinning
 * up Baileys / Anthropic / Prisma.
 *
 * Rules:
 * - human_handoff   → conversation needs_human, reaction ✅
 * - opt_out         → conversation opt_out,   reaction 👌
 * - one of the four 'service' intents on a 'new' lead → qualifies it, ✅
 * - everything else → no transition, reaction 👍
 *
 * Already-terminal lead statuses (qualified, needs_human, opt_out) are NOT
 * downgraded by a subsequent 'general_question'.
 */
export const decideStatusAndReaction = (
  intent: Intent,
  currentLeadStatus: "new" | "qualified" | "needs_human" | "opt_out" | string,
): StatusDecision => {
  if (intent === "human_handoff") {
    return { leadStatus: "needs_human", conversationStatus: "needs_human", reaction: "✅" };
  }
  if (intent === "opt_out") {
    return { leadStatus: "opt_out", conversationStatus: "opt_out", reaction: "👌" };
  }
  if (
    intent === "contact_z" ||
    intent === "contact_tel" ||
    intent === "mailing" ||
    intent === "data_enrichment"
  ) {
    const next = currentLeadStatus === "new" ? "qualified" : (currentLeadStatus as StatusDecision["leadStatus"]);
    return { leadStatus: next, conversationStatus: "active", reaction: "✅" };
  }
  return {
    leadStatus: (currentLeadStatus as StatusDecision["leadStatus"]) || "new",
    conversationStatus: "active",
    reaction: "👍",
  };
};
