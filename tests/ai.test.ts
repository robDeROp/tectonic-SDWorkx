import { describe, expect, it } from "vitest";
import { validateResult, aiConfiguration } from "../lib/ai";
import { currentJob } from "../lib/worker";
import type { JobInput } from "../lib/types";
const input: JobInput = {
  question: "Wat moet ik doen?",
  answer: "Bezorg een vakantieattest.",
  documents: [
    {
      id: "doc-1",
      name: "Bron",
      kind: "Intern",
      date: null,
      content: "Bezorg een vakantieattest. Controleer de loonhistoriek.",
      fictional: true,
    },
  ],
};
const assessment = {
  documentId: "doc-1",
  score: 90,
  summary: "Relevant",
  source: "Intern",
  age: "Onbekend",
  relevance: "Belgische bediende",
  contradictions: [],
};
const finding = {
  category: "evidence",
  severity: "info",
  passage: input.answer,
  explanation: "Komt overeen met de bron.",
  citations: [{ documentId: "doc-1", quote: input.answer }],
};
describe("Trust contracts", () => {
  it("accepts a complete assessment with a bounded score", () =>
    expect(
      validateResult("documents", { assessments: [assessment] }, input),
    ).toHaveProperty("assessments"));
  it("rejects unbounded or fractional percentages", () => {
    for (const score of [-1, 101, 99.3])
      expect(() =>
        validateResult(
          "documents",
          { assessments: [{ ...assessment, score }] },
          input,
        ),
      ).toThrow();
  });
  it("rejects missing, duplicate and invented documents", () => {
    expect(() =>
      validateResult("documents", { assessments: [] }, input),
    ).toThrow();
    expect(() =>
      validateResult(
        "documents",
        { assessments: [assessment, assessment] },
        input,
      ),
    ).toThrow();
    expect(() =>
      validateResult(
        "documents",
        { assessments: [{ ...assessment, documentId: "invented" }] },
        input,
      ),
    ).toThrow();
  });
  it("requires real source quotes in drafts", () =>
    expect(() =>
      validateResult(
        "draft",
        {
          answer: "Een antwoord",
          citations: [{ documentId: "doc-1", quote: "Niet bestaande tekst" }],
        },
        input,
      ),
    ).toThrow());
  it("accepts a grounded positive review", () =>
    expect(
      validateResult(
        "review",
        { verdict: "approved", summary: "Onderbouwd", findings: [finding] },
        input,
      ),
    ).toHaveProperty("verdict", "approved"));
  it("rejects approval without evidence or with warnings", () => {
    expect(() =>
      validateResult(
        "review",
        { verdict: "approved", summary: "Goed", findings: [] },
        input,
      ),
    ).toThrow();
    expect(() =>
      validateResult(
        "review",
        {
          verdict: "approved",
          summary: "Goed",
          findings: [{ ...finding, severity: "warning" }],
        },
        input,
      ),
    ).toThrow();
  });
  it("rejects a review of an invented answer passage", () =>
    expect(() =>
      validateResult(
        "review",
        {
          verdict: "changes_requested",
          summary: "Niet goed",
          findings: [{ ...finding, passage: "Dit staat niet in het antwoord" }],
        },
        input,
      ),
    ).toThrow());
  it("allows a lack-of-evidence finding with no fabricated citation", () =>
    expect(
      validateResult(
        "review",
        {
          verdict: "changes_requested",
          summary: "Onvoldoende kennis",
          findings: [
            {
              category: "missing",
              severity: "warning",
              passage: "",
              explanation: "Dit onderwerp wordt niet gedekt.",
              citations: [],
            },
          ],
        },
        input,
      ),
    ).toHaveProperty("verdict", "changes_requested"));
  it("reports actual missing config instead of supplying a mock", () => {
    const result = aiConfiguration();
    expect(result.configured).toBe(result.missing.length === 0);
  });
});
describe("Version fences", () => {
  const ticket = {
    generation: 2,
    documentVersion: 3,
    answerVersion: 4,
    contextVersion: 2,
  };
  it("rejects old generations, documents and answers", () => {
    expect(currentJob({ ...ticket, kind: "review" }, ticket)).toBe(true);
    for (const key of [
      "generation",
      "documentVersion",
      "answerVersion",
      "contextVersion",
    ] as const)
      expect(
        currentJob(
          { ...ticket, [key]: ticket[key] - 1, kind: "review" },
          ticket,
        ),
      ).toBe(false);
  });
  it("does not discard document research when only the answer changes", () =>
    expect(
      currentJob({ ...ticket, answerVersion: 1, kind: "documents" }, ticket),
    ).toBe(true));
});
