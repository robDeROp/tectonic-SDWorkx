import { describe, expect, it } from "vitest";
import { demoDocuments } from "../lib/fixtures";
import {
  buildKnowledgeGraph,
  excerpt,
  freshness,
  topicFor,
  type KnowledgeSource,
} from "../lib/knowledge";

const now = new Date("2026-10-20T12:00:00Z");
const at = new Date("2026-10-14T09:00:00Z");
const source: KnowledgeSource = {
  hunches: [
    {
      id: "h1",
      number: 1,
      title: "Vertrekvakantiegeld voor een deeltijdse bediende",
      workingOn: "Hoe neem ik het vakantieattest mee in de eindafrekening?",
      status: "helping",
      source: "hunch",
      sourceLabel: null,
      authorId: "e-jamie",
      updatedAt: at,
    },
  ],
  hunchLinks: [
    {
      hunchId: "h1",
      kind: "document",
      refId: "d-playbook",
      relevance: 90,
      reason: "Herkend: vakantiegeld",
    },
    {
      hunchId: "h1",
      kind: "person",
      refId: "e-emma",
      relevance: 94,
      reason: "Schreef het playbook",
    },
    {
      hunchId: "h1",
      kind: "person",
      refId: "e-lotte",
      relevance: 70,
      reason: "Volgt de regelgeving op",
    },
  ],
  helpCalls: [{ hunchId: "h1", recipientId: "e-lotte", state: "accepted" }],
  hunchMessages: [{ hunchId: "h1", authorId: "e-lotte" }],
  tickets: [
    {
      id: "t1",
      number: 1042,
      customer: "Sophie De Smet",
      company: "Atelier Noord",
      subject: "Vakantiegeld bij uitdiensttreding",
      question: "Beste SD Worx,\n\nHoe verwerken we zijn vertrekvakantiegeld?",
      status: "open",
      updatedAt: at,
    },
  ],
  ticketDocuments: demoDocuments.map((d, i) => ({
    id: `t1-${d.key}`,
    ticketId: "t1",
    name: d.name,
    kind: d.kind,
    date: d.date,
    content: d.content,
    fictional: true,
    createdAt: new Date(at.getTime() + i),
  })),
  ticketMessages: [{ ticketId: "t1", author: "Emma Peeters" }],
};
const graph = buildKnowledgeGraph(source, now);
const item = (id: string) => graph.items.find((i) => i.id === id)!;

describe("kennisgraaf", () => {
  it("builds the organisation from the directory: org, departments, teams", () => {
    expect(graph.units.filter((u) => u.level === 1).map((u) => u.name)).toEqual(
      ["Customer care", "Engineering", "Legal", "Marketing"],
    );
    const emma = graph.people.find((p) => p.id === "e-emma")!;
    expect(emma.managerId).toBe("e-pieter");
    expect(graph.people.find((p) => p.id === "e-pieter")!.isHead).toBe(true);
    expect(emma.expertise[0].weight).toBe(94);
  });
  it("merges ticket sources with directory documents by name", () => {
    const docs = graph.items.filter((i) => i.type === "doc");
    expect(
      docs.filter((d) => d.title.startsWith("Payroll playbook")),
    ).toHaveLength(1);
    expect(item("ticket:t1").refs.map((r) => r.to)).toEqual([
      "d-kader",
      "d-playbook",
      "td-faq-vakantie-vertrek-archief-2021",
    ]);
  });
  it("marks a document replaced by a newer one as superseded", () => {
    expect(item("d-playbook").refs).toContainEqual({
      to: "td-faq-vakantie-vertrek-archief-2021",
      rel: "supersedes",
    });
    expect(item("td-faq-vakantie-vertrek-archief-2021").fresh.label).toBe(
      "Vervangen",
    );
    expect(item("d-playbook").fresh.label).toBe("Actueel");
  });
  it("links a hunch to its sources, helpers and suggested experts", () => {
    const h = item("h1");
    expect(h.refs).toEqual([
      { to: "d-playbook", rel: "uses", reason: "Herkend: vakantiegeld" },
    ]);
    expect(h.participants).toEqual(["e-lotte"]);
    expect(h.experts).toEqual(["e-emma"]);
    expect(h.topic).toBe("vertrek");
    expect(h.href).toBe("/hunches/h1");
  });
  it("names people from ticket mails and keeps the customer outside the directory", () => {
    const t = item("ticket:t1");
    expect(t.participants).toEqual(["e-emma"]);
    expect(t.authorId).toBeNull();
    expect(t.authorLabel).toBe("Sophie De Smet · Atelier Noord");
  });
  it("links conversations to the documents they share words with", () => {
    expect(item("c-attest").refs.map((r) => r.to)).toContain("d-playbook");
    expect(item("c-auth").refs.every((r) => r.rel === "discusses")).toBe(true);
  });
});

describe("kennisgraaf helpers", () => {
  it("rates freshness by age", () => {
    expect(freshness("2026-01-01", false, now).label).toBe("Actueel");
    expect(freshness("2024-06-01", false, now).label).toBe("Nakijken");
    expect(freshness("2021-02-12", false, now).label).toBe("Verouderd");
    expect(freshness("2026-01-01", true, now).label).toBe("Vervangen");
  });
  it("recognises topics and strips document disclaimers", () => {
    expect(topicFor("Toegang tot de payroll-API")).toBe("api");
    expect(topicFor("Iets heel anders")).toBe("overig");
    expect(excerpt("FICTIEF MATERIAAL — geen advies. De kern.")).toBe(
      "De kern.",
    );
  });
});
