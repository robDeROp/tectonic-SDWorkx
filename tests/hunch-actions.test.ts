import { describe, expect, it } from "vitest";
import { hunchActionInput, validateHunchActions } from "../lib/hunch-actions";
import { hunchDemoData } from "../lib/hunch-demo";
import { contextView, personView } from "../lib/hunches";
import { findEmployee } from "../lib/directory";
import type { HunchDetail } from "../lib/types";

const demo = hunchDemoData();
const row = demo.hunches.find((hunch) => hunch.id === "hunch-teams-api")!;
const hunch: HunchDetail = {
  id: row.id!,
  number: 15,
  title: row.title,
  workingOn: row.workingOn,
  status: "open",
  source: "teams",
  sourceLabel: row.sourceLabel ?? null,
  author: personView(findEmployee(row.authorId)!),
  helper: null,
  createdAt: row.createdAt!.toISOString(),
  updatedAt: row.updatedAt!.toISOString(),
  context: contextView(demo.context.filter((link) => link.hunchId === row.id)),
  relatedHunches: [],
  messages: [],
  calls: [],
  passesLeft: 2,
  viewer: { isAuthor: true, isHelper: false },
};
const input = hunchActionInput(hunch);
const source = input.sources.find((item) => item.kind === "document")!;
const contact = source.personIds[0];
const action = {
  title: "Bespreek de API-documentatie",
  reason:
    "Deze collega is eigenaar van een gekoppeld document en kan de juiste ingang toelichten.",
  kind: "contact",
  personId: contact,
  evidence: [{ sourceId: source.id, quote: source.detail.slice(0, 80) }],
};

describe("Gemini action grounding", () => {
  it("includes document owners even when they are not among matched people", () => {
    const withoutPeople = hunchActionInput({
      ...hunch,
      context: { ...hunch.context, people: [] },
    });
    expect(
      withoutPeople.candidates.some((person) => person.id === contact),
    ).toBe(true);
    expect(
      validateHunchActions({ actions: [action] }, withoutPeople)[0].person?.id,
    ).toBe(contact);
  });
  it("accepts a proposal with an exact quote and a related person", () => {
    expect(validateHunchActions({ actions: [action] }, input)).toHaveLength(1);
  });
  it("rejects invented sources, quotes and colleagues", () => {
    for (const replacement of [
      { personId: "unknown-person" },
      {
        evidence: [
          { sourceId: "document:invented", quote: source.detail.slice(0, 80) },
        ],
      },
      {
        evidence: [
          {
            sourceId: source.id,
            quote: "Dit staat nergens in de meegegeven bron.",
          },
        ],
      },
    ])
      expect(() =>
        validateHunchActions(
          { actions: [{ ...action, ...replacement }] },
          input,
        ),
      ).toThrow();
  });
  it("rejects contact recommendations without a matching source relation", () => {
    const unrelated = input.candidates.find(
      (person) => !source.personIds.includes(person.id),
    )!;
    expect(unrelated).toBeDefined();
    expect(() =>
      validateHunchActions(
        { actions: [{ ...action, personId: unrelated.id }] },
        input,
      ),
    ).toThrow();
  });
  it("requires evidence and bounds the number of proposed actions", () => {
    expect(() =>
      validateHunchActions({ actions: [{ ...action, evidence: [] }] }, input),
    ).toThrow();
    expect(() =>
      validateHunchActions({ actions: Array(5).fill(action) }, input),
    ).toThrow();
    expect(() =>
      validateHunchActions({ actions: [{ ...action, kind: "read" }] }, input),
    ).toThrow();
  });
  it("includes prior hunches as evidence with a real internal link", () => {
    const related = { ...hunch, id: "prior-hunch", title: "Eerdere API-vraag" };
    const enriched = hunchActionInput({ ...hunch, relatedHunches: [related] });
    expect(
      enriched.sources.find((item) => item.id === "hunch:prior-hunch")?.href,
    ).toBe("/hunches/prior-hunch");
  });
});
