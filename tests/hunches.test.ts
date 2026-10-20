import { describe, expect, it } from "vitest";
import { findEmployee } from "../lib/directory";
import { awayUntil, contextView, findContext, routeCall } from "../lib/hunches";

const jamie = findEmployee("e-jamie")!;
const payroll =
  "Hoe verwerk ik het vertrekvakantiegeld in de eindafrekening van een deeltijdse bediende?";
/* The people Hunch links to a payroll question, most relevant first. */
const people = contextView(
  findContext(payroll, findEmployee("e-noah")!),
).people;

describe("call for help routing", () => {
  it("skips people who are out of office and notifies the next in line", () => {
    const route = routeCall({ people, authorId: "e-noah", exclude: [] });
    expect(route.skipped.map((s) => s.employee.id)).toEqual(["e-emma"]);
    expect(route.recipient?.id).toBe("e-pieter");
  });
  it("never routes to the author or to someone already asked", () => {
    const route = routeCall({
      people,
      authorId: "e-pieter",
      exclude: ["e-lotte"],
    });
    expect(route.recipient?.id).toBe("e-jamie");
  });
  it("returns no recipient when everyone is away or asked", () => {
    const route = routeCall({
      people,
      authorId: "e-noah",
      exclude: people.map((p) => p.id).filter((id) => id !== "e-emma"),
    });
    expect(route.recipient).toBeNull();
  });
  it("treats people as available again after their absence", () => {
    const emma = findEmployee("e-emma")!;
    expect(awayUntil(emma)).not.toBeNull();
    expect(awayUntil(emma, new Date(Date.now() + 10 * 864e5))).toBeNull();
  });
});

describe("context linked to a hunch", () => {
  it.each([
    payroll,
    "How do I handle departure holiday pay in the final settlement for a part-time white-collar employee?",
  ])(
    "links relevant context for English and legacy Dutch questions: %s",
    (question) => {
      const view = contextView(findContext(question, jamie));
      expect(view.people[0].id).toBe("e-emma");
      expect(view.people.map((p) => p.id)).not.toContain("e-jamie");
      expect(view.documents.map((d) => d.id)).toContain("d-playbook");
      expect(view.conversations.map((c) => c.id)).toContain("c-attest");
      expect(view.documents[0].reason).toMatch(/^Matched: /);
      expect(view.documents[0].reason).not.toMatch(
        /vakantie|eindafrekening|bediende/,
      );
    },
  );
  it("mixes knowledge from different areas when the question does", () => {
    const view = contextView(
      findContext(
        "Een campagne over vertrekvakantiegeld in de nieuwsbrief",
        jamie,
      ),
    );
    const ids = view.people.map((p) => p.id);
    expect(ids).toContain("e-emma");
    expect(ids).toContain("e-hanne");
  });
  it("leaves out what the author removed", () => {
    const view = contextView(
      findContext(payroll, jamie, ["person:e-emma", "document:d-playbook"]),
    );
    expect(view.people.map((p) => p.id)).not.toContain("e-emma");
    expect(view.documents.map((d) => d.id)).not.toContain("d-playbook");
  });
  it("falls back to the author's team when nothing matches", () => {
    const view = contextView(
      findContext("Ik weet niet waar te beginnen", jamie),
    );
    expect(view.people.every((p) => p.team === "Payroll Belgium")).toBe(true);
    expect(view.documents).toEqual([]);
  });
  it("matches at the start of words only", () => {
    const view = contextView(findContext("Een rapid prototype", jamie));
    expect(view.documents.map((d) => d.id)).not.toContain("d-api");
  });
});
