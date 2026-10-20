import { randomUUID } from "node:crypto";
import { findEmployee } from "./directory";
import { findContext } from "./hunches";
import type { helpCalls, hunchMessages, hunches } from "./db/schema";
import { additionalHunchDemos } from "./hunch-demo-scenarios";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export function hunchDemoData() {
  const demo: (typeof hunches.$inferInsert)[] = [
    {
      id: "hunch-deeltijds",
      authorId: "e-jamie",
      title: "Departure holiday pay for a part-time employee",
      workingOn:
        "I'm preparing the final settlement for a white-collar employee at Atelier Noord who moved from full-time to part-time work halfway through the year. How do I handle departure holiday pay, and what goes on the holiday certificate?",
      status: "waiting",
      createdAt: ago(95),
      updatedAt: ago(90),
    },
    {
      id: "hunch-api",
      authorId: "e-jamie",
      title: "Retrieving a customer's payroll data through the API",
      workingOn:
        "A customer wants to retrieve their payroll data automatically in their own HR tool. Which API do we use, and who arranges access?",
      status: "open",
      createdAt: ago(30),
      updatedAt: ago(30),
    },
    {
      id: "hunch-rekenregel",
      authorId: "e-noah",
      title: "Holiday pay calculation rule when working hours change",
      workingOn:
        "I'm working on PR 1842 in the payroll engine. How should departure holiday pay be calculated when a white-collar employee moved to part-time work during the year? I want to make sure the test cases are correct.",
      status: "waiting",
      source: "teams",
      sourceLabel: "#payroll-engine-dev",
      createdAt: ago(240),
      updatedAt: ago(20),
    },
    {
      id: "hunch-attest",
      authorId: "e-tom",
      title:
        "Why does the holiday certificate arrive after the final settlement?",
      workingOn:
        "A customer called because their departing white-collar employee has received the final settlement but not the holiday certificate. I want to explain how the process works.",
      status: "waiting",
      source: "outlook",
      sourceLabel: "Thomas's holiday certificate",
      createdAt: ago(50),
      updatedAt: ago(45),
    },
    {
      id: "hunch-praktijk",
      authorId: "e-lotte",
      title: "How do we apply the new holiday pay guideline in practice?",
      workingOn:
        "I'm writing a legal note about the new holiday pay guideline. I'm looking for someone who prepares final settlements every day to check whether the note is practical.",
      status: "waiting",
      createdAt: ago(120),
      updatedAt: ago(8),
    },
    {
      id: "hunch-webinar",
      authorId: "e-hanne",
      title: "Final settlement examples for a webinar",
      workingOn:
        "I'm preparing a webinar for HR managers on termination of employment. Customers asked for concrete examples of a final settlement with departure holiday pay. Which examples can we show?",
      status: "open",
      createdAt: ago(55),
      updatedAt: ago(55),
    },
    {
      id: "hunch-nieuwsbrief",
      authorId: "e-jamie",
      title: "Explaining holiday pay changes in the newsletter",
      workingOn:
        "I'm writing a newsletter article about the new holiday pay rules. What has worked before when communicating legal changes to customers?",
      status: "resolved",
      createdAt: ago(60 * 24 * 3),
      updatedAt: ago(60 * 24 * 2),
    },
  ];
  const extra = additionalHunchDemos();
  demo.push(...colleagueHunches(), ...extra.hunches);
  const away = (id: string) => findEmployee(id)?.outOfOffice?.end ?? null;
  const calls: (typeof helpCalls.$inferInsert)[] = [
    {
      hunchId: "hunch-deeltijds",
      recipientId: "e-emma",
      state: "skipped",
      note: away("e-emma"),
      createdAt: ago(90),
    },
    {
      hunchId: "hunch-deeltijds",
      recipientId: "e-pieter",
      state: "notified",
      emailedAt: ago(89.9),
      createdAt: ago(89.9),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-emma",
      state: "skipped",
      note: away("e-emma"),
      createdAt: ago(200),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-pieter",
      state: "passed",
      note: "Jamie handles these cases every day.",
      emailedAt: ago(199.9),
      createdAt: ago(199.9),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(20),
      createdAt: ago(20),
    },
    {
      hunchId: "hunch-attest",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(45),
      createdAt: ago(45),
    },
    {
      hunchId: "hunch-praktijk",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(8),
      createdAt: ago(8),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      recipientId: "e-yasmine",
      state: "skipped",
      note: away("e-yasmine"),
      createdAt: ago(60 * 70),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      recipientId: "e-hanne",
      state: "accepted",
      emailedAt: ago(60 * 70 - 0.1),
      createdAt: ago(60 * 70 - 0.1),
    },
  ].map((c) => ({ id: randomUUID(), ...c }));
  calls.push(...extra.calls);
  const messages = [...demoMessages(demo), ...extra.messages];
  // Each hunch links its own context from everything said in it so far.
  const context = demo.flatMap((h) =>
    findContext(
      [
        h.title,
        h.workingOn,
        ...messages.filter((m) => m.hunchId === h.id).map((m) => m.content),
      ].join(" "),
      findEmployee(h.authorId)!,
    ).map((l) => ({ hunchId: h.id!, ...l })),
  );
  return { hunches: demo, calls, messages, context };
}

/**
 * Demo conversations. Hunches opened in the platform start with the author's
 * description; plugin hunches start with the thread they were opened from.
 */
function demoMessages(demo: (typeof hunches.$inferInsert)[]) {
  const by = (hunchId: string) => demo.find((h) => h.id === hunchId)!;
  const person = (id: string) => ({
    authorId: id,
    authorName: findEmployee(id)?.displayName ?? id,
  });
  const opening = (hunchId: string, extra = {}) => {
    const h = by(hunchId);
    return {
      hunchId,
      ...person(h.authorId),
      content: h.workingOn,
      createdAt: h.createdAt,
      ...extra,
    };
  };
  const rows: Omit<typeof hunchMessages.$inferInsert, "id">[] = [
    opening("hunch-deeltijds", {
      attachmentName: "Atelier Noord customer meeting notes.txt",
      attachmentText:
        "FICTIONAL DEMONSTRATION NOTES — Atelier Noord customer meeting\n\n" +
        "- Thomas, a white-collar employee, leaves employment on 30 September.\n" +
        "- Full-time from January through May, 80% working hours from June.\n" +
        "- 6 days of holiday remain untaken.\n" +
        "- The customer wants to know what goes on the holiday certificate and whether both periods are listed separately.\n" +
        "- Jamie's action: prepare the calculation and respond before Friday.",
    }),
    opening("hunch-api"),
    opening("hunch-webinar"),
    opening("hunch-praktijk"),
    opening("hunch-nieuwsbrief"),
    {
      hunchId: "hunch-nieuwsbrief",
      ...person("e-hanne"),
      content:
        "Be sure to look at the indexation campaign review. A short checklist at the top worked much better than a lengthy explanation.",
      createdAt: ago(60 * 60),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      ...person("e-jamie"),
      content: "Great, I'll use that. Thank you!",
      createdAt: ago(60 * 48),
    },
    // Opened from a Teams thread with the Hunch plugin.
    {
      hunchId: "hunch-rekenregel",
      ...person("e-ines"),
      source: "teams",
      content:
        "Noah, can you check the part-time work test cases before we merge PR 1842?",
      createdAt: ago(260),
    },
    {
      hunchId: "hunch-rekenregel",
      ...person("e-noah"),
      source: "teams",
      content:
        "Will do. I'm just not sure how the rule should work when someone moves from full-time to part-time work halfway through the year. Who can confirm that?",
      createdAt: ago(245),
    },
    // Opened from a customer mail in Outlook with the Hunch plugin.
    {
      hunchId: "hunch-attest",
      authorName: "Sophie De Smet",
      authorDetail: "HR manager · Atelier Noord (customer)",
      source: "outlook",
      content:
        "Hi Tom,\n\nThomas has received his final settlement, but not his holiday certificate. He needs it for his new employer. When can we expect it?\n\nRegards,\nSophie",
      createdAt: ago(70),
    },
    {
      hunchId: "hunch-attest",
      ...person("e-tom"),
      source: "outlook",
      content:
        "Hi Sophie, I'll find out exactly how the process works and get back to you today.",
      createdAt: ago(52),
    },
  ];
  // Every other platform hunch opens with its description.
  const covered = new Set(rows.map((r) => r.hunchId));
  for (const h of demo)
    if (!covered.has(h.id) && (h.source ?? "hunch") === "hunch")
      rows.push(opening(h.id));
  return rows.map((m) => ({ id: randomUUID(), ...m }));
}

/** Quieter hunches from colleagues, so the full overview feels lived in. */
function colleagueHunches(): (typeof hunches.$inferInsert)[] {
  const hunch = (
    id: string,
    authorId: string,
    title: string,
    workingOn: string,
    status: string,
    minutesAgo: number,
  ) => ({
    id,
    authorId,
    title,
    workingOn,
    status,
    createdAt: ago(minutesAgo),
    updatedAt: ago(minutesAgo - 30),
  });
  return [
    hunch(
      "hunch-checklist",
      "e-pieter",
      "Updating the final settlement checklist after the new guideline",
      "The final settlement checklist needs to be updated for the new holiday pay guideline. Who has the latest version, and what needs to change?",
      "open",
      180,
    ),
    hunch(
      "hunch-breaking",
      "e-bram",
      "Announcing a breaking change in the public API",
      "We need to rename a field in the payroll API. How have we announced this kind of change to integration partners before?",
      "open",
      60 * 26,
    ),
    hunch(
      "hunch-indexering",
      "e-tom",
      "What do we tell customers about the 2027 indexation?",
      "Customers are already asking about next year's indexation. Is a standard answer or campaign being prepared?",
      "open",
      60 * 48,
    ),
    hunch(
      "hunch-testomgeving",
      "e-noah",
      "Setting up a local test environment for the payroll engine",
      "I'm new to the team and want to run the payroll engine locally with test data. How do we do that here?",
      "resolved",
      60 * 24 * 4,
    ),
    hunch(
      "hunch-rekenregel-doc",
      "e-ines",
      "How do we document a new calculation rule?",
      "I'm adding a calculation rule to the payroll engine. Where and in what format do we record the functional explanation?",
      "resolved",
      60 * 24 * 5,
    ),
    hunch(
      "hunch-testpanel",
      "e-yasmine",
      "Which customers want to test the new newsletter?",
      "We're refreshing the newsletter for HR professionals. Which customers previously said they wanted to help test it?",
      "resolved",
      60 * 24 * 6,
    ),
  ];
}
