import { describe, expect, it } from "vitest";
import { completionScore, relevanceMatch } from "../lib/hunch";
import type { DocumentAssessment, ReviewResult } from "../lib/types";

describe("Hunch context and final score", () => {
  it("matches meaningful terms regardless of case or accents", () => {
    expect(
      relevanceMatch("Payroll België vakantiegeld", "PAYROLL voor Belgie"),
    ).toEqual({
      score: 67,
      matchedTerms: ["payroll", "belgie"],
    });
    expect(
      relevanceMatch("Hoe moeten we dit doen?", "de het we voor").score,
    ).toBe(0);
    expect(relevanceMatch("", "vakantiegeld").score).toBe(0);
    expect(
      relevanceMatch(
        "Quantumspinverstrengeling tijdens qubitkalibratie onderzoeken in 2026",
        "Vakantiegeld onderzoeken in 2026",
      ).score,
    ).toBe(0);
  });
  it("does not count substrings or repeated terms as separate matches", () => {
    expect(relevanceMatch("loon loon loon", "loongrens").score).toBe(0);
    expect(relevanceMatch("loon loon loon", "loon").score).toBe(100);
  });
  it("records the final score with an inspectable breakdown", () => {
    const docs = [{ score: 90 }, { score: 50 }] as DocumentAssessment[];
    const review = { verdict: "approved" } as ReviewResult;
    expect(completionScore(docs, review, "2026-10-20")).toEqual({
      score: 82,
      knowledgeScore: 70,
      reviewScore: 100,
      documentCount: 2,
      closedAt: "2026-10-20",
    });
    expect(
      completionScore(
        docs,
        { ...review, verdict: "changes_requested" },
        "2026-10-20",
      ).score,
    ).toBe(62);
  });
});
