import { randomUUID } from "node:crypto";
import { findEmployee } from "./directory";
import type { helpCalls, hunchMessages, hunches } from "./db/schema";
import type { HelpCallState, HunchSource, HunchStatus } from "./types";

type Scenario = {
  id: string;
  author: string;
  source: HunchSource;
  label?: string;
  status: HunchStatus;
  title: string;
  question: string;
  minutesAgo: number;
  calls?: { recipient: string; state: HelpCallState; note?: string }[];
  messages: {
    author?: string;
    external?: { name: string; detail: string };
    source: HunchSource;
    content: string;
    attachment?: { name: string; text: string };
  }[];
};

const scenarios: Scenario[] = [
  {
    id: "hunch-samenwerken",
    author: "e-jamie",
    source: "hunch",
    status: "helping",
    title: "Completing the departure holiday pay checklist together",
    question:
      "I'm updating the final settlement checklist. What information about part-time work do we still need to request?",
    minutesAgo: 80,
    calls: [{ recipient: "e-lotte", state: "accepted" }],
    messages: [
      {
        author: "e-lotte",
        source: "hunch",
        content:
          "I'll take a look. Let's confirm the salary history and the change in working hours first. Then we'll go through the checklist together.",
      },
    ],
  },
  {
    id: "hunch-teams-api",
    author: "e-jamie",
    source: "teams",
    label: "#api-integrations",
    status: "open",
    title: "Teams: preparing access to the payroll API",
    question:
      "A customer team is asking in Teams what access is needed for the payroll API. I'm looking for the documentation and the right colleague.",
    minutesAgo: 25,
    messages: [
      {
        author: "e-noah",
        source: "teams",
        content:
          "Does anyone have the API access checklist for a new integration partner?",
      },
      {
        author: "e-jamie",
        source: "teams",
        content:
          "I'll find the onboarding documentation. We haven't requested access yet.",
      },
    ],
  },
  {
    id: "hunch-teams-hulp",
    author: "e-noah",
    source: "teams",
    label: "#payroll-engine-dev",
    status: "helping",
    title: "Teams: payroll checks the part-time work test case",
    question:
      "The departure holiday pay calculation rule needs an extra test case. Jamie is helping review the functional inputs.",
    minutesAgo: 110,
    calls: [{ recipient: "e-jamie", state: "accepted" }],
    messages: [
      {
        author: "e-noah",
        source: "teams",
        content:
          "I have a test case ready for a move to 80% working hours. Who can review the functional inputs?",
      },
      {
        author: "e-jamie",
        source: "teams",
        content: "Send over the fictional data and I'll take a look.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "I've taken on the help request. I'm comparing the periods with the final settlement checklist.",
      },
    ],
  },
  {
    id: "hunch-teams-opgelost",
    author: "e-jamie",
    source: "teams",
    label: "#api-integrations",
    status: "resolved",
    title: "Teams: API access documentation found",
    question:
      "We were looking for the right API onboarding for an integration partner. The documentation has been found and shared.",
    minutesAgo: 150,
    calls: [{ recipient: "e-ines", state: "accepted" }],
    messages: [
      {
        author: "e-jamie",
        source: "teams",
        content: "Where is the current documentation for the payroll API?",
      },
      {
        author: "e-ines",
        source: "teams",
        content: "It's in the DevOps Wiki. I'll point you to the right place.",
      },
      {
        author: "e-ines",
        source: "hunch",
        content:
          "The API onboarding is listed under relevant documents. Start with access and the test account.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "Found it, thanks! I can move forward and will close this hunch.",
      },
    ],
  },
  {
    id: "hunch-outlook-bijlage",
    author: "e-jamie",
    source: "outlook",
    label: "Additional final settlement information",
    status: "open",
    title: "Outlook: customer email with a final settlement attachment",
    question:
      "The customer sent additional notes for a final settlement. I want to check what information is still missing.",
    minutesAgo: 35,
    messages: [
      {
        external: {
          name: "Sophie De Smet",
          detail: "HR manager · Atelier Noord (fictional customer)",
        },
        source: "outlook",
        content:
          "Hi Jamie,\n\nOur notes for the final settlement are attached. Can you let us know what information is still missing?\n\nRegards,\nSophie",
        attachment: {
          name: "Customer final settlement notes.txt",
          text: "FICTIONAL TEST DATA\n\nThomas leaves on 30 September. He has worked 80% hours since June. The salary history and the record of leave taken still need to be confirmed. These notes contain no calculation.",
        },
      },
      {
        author: "e-jamie",
        source: "outlook",
        content:
          "Hi Sophie, thanks for the notes. I'll review them and let you know what information is still needed.",
      },
    ],
  },
  {
    id: "hunch-outlook-hulp",
    author: "e-jamie",
    source: "outlook",
    label: "Holiday certificate check",
    status: "helping",
    title: "Outlook: a colleague helps check a holiday certificate",
    question:
      "A customer is asking whether all periods are correctly listed on the holiday certificate. Pieter is helping check the case details.",
    minutesAgo: 65,
    calls: [{ recipient: "e-pieter", state: "accepted" }],
    messages: [
      {
        external: {
          name: "Milan Verhoeven",
          detail: "HR employee · Studio Rivier (fictional customer)",
        },
        source: "outlook",
        content:
          "Hi Jamie,\n\nCan you check whether both the full-time and part-time periods are included in the holiday certificate? We'd like to finalise this.\n\nThanks,\nMilan",
      },
      {
        author: "e-jamie",
        source: "outlook",
        content: "I'll ask my colleague to help check the employment history.",
      },
      {
        author: "e-pieter",
        source: "hunch",
        content:
          "I've taken this on. I'll check the two periods and let you know if any information is missing.",
      },
    ],
  },
  {
    id: "hunch-outlook-opgelost",
    author: "e-tom",
    source: "outlook",
    label: "Re: information needed for the final settlement",
    status: "resolved",
    title: "Outlook: missing case details clarified",
    question:
      "The customer didn't know what information was needed for the final settlement. Jamie helped clarify the checklist.",
    minutesAgo: 200,
    calls: [{ recipient: "e-jamie", state: "accepted" }],
    messages: [
      {
        external: {
          name: "Sophie De Smet",
          detail: "HR manager · Atelier Noord (fictional customer)",
        },
        source: "outlook",
        content:
          "Hi Tom, what information do we still need to provide before you can prepare the final settlement?",
      },
      {
        author: "e-tom",
        source: "outlook",
        content: "I'll check the checklist with payroll and get back to you.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "Request the salary history, working hours, leave taken and holiday pay already paid. The internal checklist is in the context.",
      },
      {
        author: "e-tom",
        source: "hunch",
        content:
          "The required information is clear. This sample case is complete.",
      },
    ],
  },
  {
    id: "hunch-geannuleerd",
    author: "e-jamie",
    source: "hunch",
    status: "open",
    title: "Help request withdrawn: found the checklist myself",
    question:
      "I was looking for the final settlement checklist and asked for help. I've since found the right version, so the help request has been withdrawn.",
    minutesAgo: 100,
    calls: [
      {
        recipient: "e-pieter",
        state: "cancelled",
        note: "Found the checklist myself",
      },
    ],
    messages: [
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "The help request has been withdrawn. I'll continue on my own with the checklist I found.",
      },
    ],
  },
  {
    id: "hunch-doorgeven-limiet",
    author: "e-noah",
    source: "hunch",
    status: "waiting",
    title: "Help request reaches payroll after two handovers",
    question:
      "For the departure holiday pay calculation rule, I'm looking for someone who processes final settlements every day. The question has been passed on twice.",
    minutesAgo: 130,
    calls: [
      {
        recipient: "e-pieter",
        state: "passed",
        note: "Lotte can clarify the functional explanation.",
      },
      {
        recipient: "e-lotte",
        state: "passed",
        note: "Jamie handles these cases every day.",
      },
      { recipient: "e-jamie", state: "notified" },
    ],
    messages: [
      {
        author: "e-noah",
        source: "hunch",
        content:
          "The question is now with Jamie. This example shows the limit of two handovers.",
      },
    ],
  },
  {
    id: "hunch-geen-bronnen",
    author: "e-jamie",
    source: "hunch",
    status: "open",
    title: "New question without matching knowledge sources",
    question:
      "I'm organising an introductory session and looking for practical experiences of welcoming new visitors.",
    minutesAgo: 45,
    messages: [],
  },
];

export function additionalHunchDemos() {
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const rows: (typeof hunches.$inferInsert)[] = [];
  const calls: (typeof helpCalls.$inferInsert)[] = [];
  const messages: (typeof hunchMessages.$inferInsert)[] = [];
  for (const scenario of scenarios) {
    rows.push({
      id: scenario.id,
      authorId: scenario.author,
      source: scenario.source,
      sourceLabel: scenario.label,
      title: scenario.title,
      workingOn: scenario.question,
      status: scenario.status,
      createdAt: ago(scenario.minutesAgo),
      updatedAt: ago(scenario.minutesAgo - 20),
    });
    for (const [index, call] of (scenario.calls ?? []).entries()) {
      const createdAt = ago(scenario.minutesAgo - 5 - index * 2);
      calls.push({
        id: randomUUID(),
        hunchId: scenario.id,
        recipientId: call.recipient,
        state: call.state,
        note: call.note,
        createdAt,
        emailedAt: call.state === "skipped" ? null : createdAt,
      });
    }
    const imported = scenario.messages.filter(
      (message) => message.source !== "hunch",
    ).length;
    for (const [index, message] of scenario.messages.entries()) {
      messages.push({
        id: randomUUID(),
        hunchId: scenario.id,
        authorId: message.author,
        authorName:
          message.external?.name ?? findEmployee(message.author!)!.displayName,
        authorDetail: message.external?.detail,
        source: message.source,
        content: message.content,
        attachmentName: message.attachment?.name,
        attachmentText: message.attachment?.text,
        createdAt: ago(
          message.source === "hunch"
            ? scenario.minutesAgo - 10 - (index - imported) * 2
            : scenario.minutesAgo + (imported - index) * 2,
        ),
      });
    }
  }
  return { hunches: rows, calls, messages };
}
