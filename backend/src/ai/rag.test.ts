import { describe, it, expect } from "vitest";
import { chunkKnowledgeBase, cosineSimilarity, __testing } from "./rag.js";

const SAMPLE_KB = `
# Contact Pro

Empresa de soluções de comunicação e atendimento.

## Serviços

### Contact Z
WhatsApp + automação + IA + campanhas.
Útil para SAC, vendas, agendamento.

### Contact Tel
Agentes de voz, URA reversa, ligações automáticas.
Útil para cobrança, pesquisa, qualificação.

### Mailing
Listas segmentadas de contatos.
Para campanhas, vendas, marketing.
`.trim();

describe("chunkKnowledgeBase", () => {
  it("splits the KB into per-section chunks", () => {
    const chunks = chunkKnowledgeBase(SAMPLE_KB);
    const titles = chunks.map((c) => c.title);
    expect(titles).toContain("Contact Z");
    expect(titles).toContain("Contact Tel");
    expect(titles).toContain("Mailing");
  });

  it("includes section heading inside the chunk content", () => {
    const chunks = chunkKnowledgeBase(SAMPLE_KB);
    const ctZ = chunks.find((c) => c.title === "Contact Z")!;
    expect(ctZ.content.toLowerCase()).toContain("whatsapp");
    expect(ctZ.content.toLowerCase()).toContain("automação");
  });

  it("filters out empty chunks", () => {
    const chunks = chunkKnowledgeBase("\n\n\n");
    expect(chunks.length).toBe(0);
  });

  it("produces stable IDs per content", () => {
    const a = chunkKnowledgeBase(SAMPLE_KB);
    const b = chunkKnowledgeBase(SAMPLE_KB);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [0.1, 0.4, -0.5, 0.2];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("returns 0 when either vector is zero", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("ranks similar text higher than dissimilar text via deterministic embeddings", () => {
    // Use the test-only deterministic embedder to validate the retrieval shape
    const refQuery = "quero contratar mailing de empresas";
    const ref = __testing.deterministicEmbedding(refQuery);
    const similar = __testing.deterministicEmbedding("preciso de mailing para empresas");
    const different = __testing.deterministicEmbedding("zzzzzz aaaa bbbb cccc");
    const simScore = cosineSimilarity(ref, similar);
    const diffScore = cosineSimilarity(ref, different);
    expect(simScore).toBeGreaterThan(diffScore);
  });
});

describe("hashChunks", () => {
  it("produces a stable hash for the same chunk set", () => {
    const a = chunkKnowledgeBase(SAMPLE_KB);
    const b = chunkKnowledgeBase(SAMPLE_KB);
    expect(__testing.hashChunks(a)).toBe(__testing.hashChunks(b));
  });

  it("changes hash when content changes", () => {
    const a = chunkKnowledgeBase(SAMPLE_KB);
    const b = chunkKnowledgeBase(
      SAMPLE_KB +
        "\n### Novo Serviço\nUm serviço adicional com descrição suficientemente longa para passar pelo filtro de tamanho mínimo do chunker.",
    );
    expect(__testing.hashChunks(a)).not.toBe(__testing.hashChunks(b));
  });
});
