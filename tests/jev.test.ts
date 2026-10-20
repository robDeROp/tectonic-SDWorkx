import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assessWithJev } from "../lib/jev";
import { callAI } from "../lib/ai";
import type { JobInput } from "../lib/types";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const input: JobInput = {
  question: "Welke attesten zijn nodig voor deze Belgische bediende?",
  answer: "Private draft must not be sent to Jev",
  documents: [
    {
      id: "doc-1",
      name: "Checklist",
      kind: "Intern",
      date: "2026-01-01",
      content: "Vraag het vakantieattest op.",
      fictional: true,
    },
  ],
};
function payload() {
  return {
    model: "jev-1.13.0",
    answers: {
      relevance: { type: "score", score: 2.4, confidence: 0.75 },
      reliability: { type: "score", score: 1.5, confidence: 0.3 },
      freshness: { type: "score", score: 3, confidence: 0.9 },
    },
  };
}
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("JEV_KEY", "test-secret");
  vi.stubEnv("GOOGLE_CLOUD_PROJECT", "test-project");
  vi.stubEnv("GOOGLE_CLOUD_LOCATION", "europe-west1");
  vi.stubEnv("GEMINI_MODEL", "test-model");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify(payload())));
  generateContent.mockResolvedValue({
    text: JSON.stringify({
      assessments: [
        {
          documentId: "doc-1",
          score: 99,
          summary: "Relevant voor de vraag",
          source: "Interne bron",
          age: "Actueel",
          relevance: "Attest vereist",
          contradictions: [],
        },
      ],
    }),
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("Jev document evaluation", () => {
  it("normalizes fractional rubric scores without confusing confidence with relevance", async () => {
    const result = await assessWithJev(input);
    expect(result["doc-1"].relevance).toEqual({ score: 80, confidence: 0.75 });
    expect(result["doc-1"].reliability.score).toBe(50);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    const body = JSON.parse(init.body);
    expect(body.state.customerQuestion).toBe(input.question);
    expect(body.state.document.content).toBe(input.documents[0].content);
    expect(init.body).not.toContain(input.answer);
    expect(init.body).not.toContain("test-secret");
    expect(body.questions.relevance.instructions).toContain("untrusted data");
  });
  it.each([null, "not-a-date", "2026-02-30"])(
    "keeps freshness unknown for date %s",
    async (date) => {
      const result = await assessWithJev({
        ...input,
        documents: [{ ...input.documents[0], date }],
      });
      expect(result["doc-1"].freshness).toBeNull();
      expect(
        JSON.parse(fetchMock.mock.calls[0][1].body).questions,
      ).not.toHaveProperty("freshness");
    },
  );
  it("requires every requested dimension and rejects out-of-range scores", async () => {
    for (const body of [
      {
        model: "jev-1.13.0",
        answers: {
          relevance: payload().answers.relevance,
          reliability: payload().answers.reliability,
        },
      },
      {
        ...payload(),
        answers: {
          ...payload().answers,
          relevance: { type: "score", score: 100, confidence: 0.9 },
        },
      },
      {
        ...payload(),
        answers: {
          ...payload().answers,
          reliability: { type: "score", score: 2, confidence: 2 },
        },
      },
    ]) {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));
      await expect(assessWithJev(input)).rejects.toThrow("geldige beoordeling");
    }
  });
  it("fails clearly without a key and makes no external request", async () => {
    vi.stubEnv("JEV_KEY", " ");
    await expect(assessWithJev(input)).rejects.toThrow("JEV_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([401, 403, 429, 500, 529, 422])(
    "handles HTTP %s without exposing upstream content or secrets",
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        new Response("test-secret private upstream error", { status }),
      );
      const error = await assessWithJev(input).catch((error: Error) => error);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("test-secret");
    },
  );
  it("handles timeouts without fabricating scores", async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException("Timeout", "TimeoutError"),
    );
    await expect(assessWithJev(input)).rejects.toThrow("geldige beoordeling");
  });
  it("isolates documents and customer questions on repeated evaluations", async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(payload())),
    );
    const docs = [
      input.documents[0],
      { ...input.documents[0], id: "doc-2", content: "Other source" },
    ];
    expect(
      Object.keys(await assessWithJev({ ...input, documents: docs })).sort(),
    ).toEqual(["doc-1", "doc-2"]);
    await assessWithJev({ ...input, question: "A different ticket question" });
    expect(
      JSON.parse(fetchMock.mock.calls[1][1].body).state.document.content,
    ).toBe("Other source");
    expect(
      JSON.parse(fetchMock.mock.calls[2][1].body).state.customerQuestion,
    ).toBe("A different ticket question");
  });
});

describe("Jev + Gemini pipeline", () => {
  it("passes original Jev signals to Gemini and persists them instead of Gemini's guessed score", async () => {
    const result = await callAI("documents", input);
    expect(result).toMatchObject({
      assessments: [
        {
          documentId: "doc-1",
          score: 80,
          jev: { relevance: { score: 80 }, model: "jev-1.13.0" },
        },
      ],
    });
    const request = JSON.parse(generateContent.mock.calls[0][0].contents);
    expect(request.data.jevAssessments["doc-1"].relevance.score).toBe(80);
    expect(request.data.documents[0].content).toBe(input.documents[0].content);
  });
  it("does not generate a misleading complete assessment when Jev fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Offline"));
    await expect(callAI("documents", input)).rejects.toThrow("Jev");
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("rejects missing Gemini document references after Jev succeeds", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ assessments: [] }),
    });
    await expect(callAI("documents", input)).rejects.toThrow();
  });
  it("keeps draft generation on Gemini without rescoring documents", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        answer: "Vraag het vakantieattest op.",
        citations: [],
      }),
    });
    await expect(callAI("draft", input)).resolves.toHaveProperty("answer");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
