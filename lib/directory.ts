/*
 * The company context Hunch reasons over.
 *
 * In production this is pulled from Microsoft Entra ID (people, teams,
 * out-of-office via Graph mailboxSettings) and from the places work already
 * happens (SharePoint, Teams, Outlook, Azure DevOps). For the proof of concept
 * it is a fixed, explicitly fictional reference table, shaped like that data.
 */

const DAY = 24 * 60 * 60 * 1000;
/* Relative dates keep the demo believable on any day it is shown. */
const days = (offset: number) =>
  new Date(Date.now() + offset * DAY).toISOString();

export type Employee = {
  /** Entra object id. */
  id: string;
  upn: string;
  displayName: string;
  jobTitle: string;
  teamId: string;
  /** Graph automaticRepliesSetting, when scheduled. */
  outOfOffice: { start: string; end: string } | null;
};

export type Team = {
  id: string;
  name: string;
  department: string;
  /** Entra group owner: the person who leads the team. */
  leadId: string;
};

/*
 * The knowledge index. Every item carries the words that point to it, learned
 * from everyday work signals. A hunch is matched against all of them directly:
 * the relevant people, documents and conversations are linked to the hunch.
 */

/** Something a person demonstrably knows about, and the signal behind it. */
export type Expertise = {
  employeeId: string;
  keywords: string[];
  /** 0–100: how strong the signal is. */
  weight: number;
  signal: string;
};

export type KnowledgeDocument = {
  id: string;
  name: string;
  source: "SharePoint" | "OneDrive" | "DevOps Wiki";
  location: string;
  ownerId: string;
  updatedAt: string;
  keywords: string[];
  /** Names of older documents this one officially replaces (SharePoint metadata). */
  replaces?: string[];
};

export type KnowledgeConversation = {
  id: string;
  title: string;
  channel: "Teams" | "Outlook" | "DevOps";
  location: string;
  participantIds: string[];
  lastActivity: string;
  snippet: string;
  keywords: string[];
};

/** The signed-in demo user. */
export const CURRENT_USER_ID = "e-jamie";

export const teams: Team[] = [
  {
    id: "payroll-be",
    name: "Payroll Belgium",
    department: "Customer care",
    leadId: "e-pieter",
  },
  {
    id: "loonmotor",
    name: "Payroll engine",
    department: "Engineering",
    leadId: "e-ines",
  },
  {
    id: "juridisch",
    name: "Legal knowledge centre",
    department: "Legal",
    leadId: "e-lotte",
  },
  {
    id: "marketing",
    name: "Marketing Benelux",
    department: "Marketing",
    leadId: "e-yasmine",
  },
  {
    id: "success",
    name: "Customer success",
    department: "Customer care",
    leadId: "e-tom",
  },
];

export const employees: Employee[] = [
  {
    id: "e-jamie",
    upn: "jamie.declercq@sdworx.example",
    displayName: "Jamie De Clercq",
    jobTitle: "Payroll consultant",
    teamId: "payroll-be",
    outOfOffice: null,
  },
  {
    id: "e-emma",
    upn: "emma.peeters@sdworx.example",
    displayName: "Emma Peeters",
    jobTitle: "Senior payroll expert",
    teamId: "payroll-be",
    outOfOffice: { start: days(-2), end: days(4) },
  },
  {
    id: "e-pieter",
    upn: "pieter.janssens@sdworx.example",
    displayName: "Pieter Janssens",
    jobTitle: "Team lead, Payroll Belgium",
    teamId: "payroll-be",
    outOfOffice: null,
  },
  {
    id: "e-lotte",
    upn: "lotte.maes@sdworx.example",
    displayName: "Lotte Maes",
    jobTitle: "Employment law adviser",
    teamId: "juridisch",
    outOfOffice: null,
  },
  {
    id: "e-noah",
    upn: "noah.willems@sdworx.example",
    displayName: "Noah Willems",
    jobTitle: "Developer",
    teamId: "loonmotor",
    outOfOffice: null,
  },
  {
    id: "e-ines",
    upn: "ines.wouters@sdworx.example",
    displayName: "Ines Wouters",
    jobTitle: "Lead developer",
    teamId: "loonmotor",
    outOfOffice: null,
  },
  {
    id: "e-bram",
    upn: "bram.claes@sdworx.example",
    displayName: "Bram Claes",
    jobTitle: "Solution architect",
    teamId: "loonmotor",
    outOfOffice: { start: days(-1), end: days(1) },
  },
  {
    id: "e-hanne",
    upn: "hanne.goossens@sdworx.example",
    displayName: "Hanne Goossens",
    jobTitle: "Marketing specialist",
    teamId: "marketing",
    outOfOffice: null,
  },
  {
    id: "e-yasmine",
    upn: "yasmine.elamrani@sdworx.example",
    displayName: "Yasmine El Amrani",
    jobTitle: "Content lead",
    teamId: "marketing",
    outOfOffice: { start: days(-3), end: days(7) },
  },
  {
    id: "e-tom",
    upn: "tom.vermeulen@sdworx.example",
    displayName: "Tom Vermeulen",
    jobTitle: "Customer success manager",
    teamId: "success",
    outOfOffice: null,
  },
];

/* Shared vocabularies, so related items are found by the same words. */
const PAYROLL = [
  "holiday pay",
  "departure holiday pay",
  "final settlement",
  "termination of employment",
  "leaving employment",
  "holiday certificate",
  "holiday entitlement",
  "dismissal",
  "white-collar employee",
  "part-time",
];
const ENGINE = [
  "api",
  "payroll engine",
  "endpoint",
  "integration",
  "calculation rule",
  "code",
  "pipeline",
  "devops",
  "deploy",
  "pull request",
  "payroll data",
  "test environment",
];
const COMMS = [
  "campaign",
  "newsletter",
  "communication",
  "customer communication",
  "audience",
  "marketing",
  "mailing",
  "webinar",
  "content",
  "indexation",
];

export const expertise: Expertise[] = [
  {
    employeeId: "e-emma",
    keywords: PAYROLL,
    weight: 94,
    signal: "Wrote the payroll playbook · answered 14 similar questions",
  },
  {
    employeeId: "e-pieter",
    keywords: [...PAYROLL, "checklist", "guideline"],
    weight: 82,
    signal: "Owner of the Final Settlement 2.0 project",
  },
  {
    employeeId: "e-lotte",
    keywords: [...PAYROLL, "guideline", "regulation", "legal"],
    weight: 71,
    signal: "Tracks holiday pay regulations",
  },
  {
    employeeId: "e-jamie",
    keywords: PAYROLL,
    weight: 64,
    signal: "Processes final settlements every week",
  },
  {
    employeeId: "e-ines",
    keywords: ["holiday pay", "part-time", "calculation rule"],
    weight: 60,
    signal: "Built the holiday pay calculation in the payroll engine",
  },
  {
    employeeId: "e-ines",
    keywords: ENGINE,
    weight: 92,
    signal: "Built the calculation module · 38 pull requests",
  },
  {
    employeeId: "e-bram",
    keywords: [...ENGINE, "versioning", "breaking"],
    weight: 86,
    signal: "Architect of the public API",
  },
  {
    employeeId: "e-noah",
    keywords: ENGINE,
    weight: 58,
    signal: "Recently started working on Payroll Engine v4",
  },
  {
    employeeId: "e-emma",
    keywords: ["calculation rule", "payroll engine"],
    weight: 52,
    signal: "Provides the functional calculation rules",
  },
  {
    employeeId: "e-yasmine",
    keywords: COMMS,
    weight: 91,
    signal: "Led the 2026 indexation campaign",
  },
  {
    employeeId: "e-hanne",
    keywords: COMMS,
    weight: 80,
    signal: "Manages the newsletter for HR professionals",
  },
  {
    employeeId: "e-tom",
    keywords: COMMS,
    weight: 67,
    signal: "Knows the questions customers actually ask",
  },
  {
    employeeId: "e-pieter",
    keywords: ["newsletter", "webinar", "communication"],
    weight: 55,
    signal: "Reviews payroll content in customer communications",
  },
];

export const documents: KnowledgeDocument[] = [
  {
    id: "d-kader",
    name: "Departure holiday pay · regulatory framework",
    source: "SharePoint",
    location: "Legal knowledge centre",
    ownerId: "e-lotte",
    updatedAt: "2026-08-15",
    keywords: [...PAYROLL, "guideline", "regulation"],
  },
  {
    id: "d-playbook",
    name: "Payroll playbook · termination of employment",
    source: "SharePoint",
    location: "Payroll Belgium",
    ownerId: "e-emma",
    updatedAt: "2026-09-10",
    keywords: PAYROLL,
    replaces: ["Holiday & departure FAQ · 2021 archive"],
  },
  {
    id: "d-checklist",
    name: "Final settlement checklist",
    source: "OneDrive",
    location: "Emma Peeters",
    ownerId: "e-emma",
    updatedAt: "2026-09-30",
    keywords: [
      "final settlement",
      "checklist",
      "holiday entitlement",
      "termination of employment",
    ],
  },
  {
    id: "d-architectuur",
    name: "Payroll engine v4 architecture",
    source: "DevOps Wiki",
    location: "Payroll engine",
    ownerId: "e-bram",
    updatedAt: "2026-09-02",
    keywords: [...ENGINE, "architecture"],
  },
  {
    id: "d-api",
    name: "API guidelines & versioning",
    source: "DevOps Wiki",
    location: "Public payroll API",
    ownerId: "e-bram",
    updatedAt: "2026-07-18",
    keywords: [
      "api",
      "endpoint",
      "integration",
      "versioning",
      "breaking",
      "payroll data",
    ],
  },
  {
    id: "d-adr",
    name: "ADR-012 · Calculation rules as configuration",
    source: "DevOps Wiki",
    location: "Payroll engine",
    ownerId: "e-ines",
    updatedAt: "2026-05-27",
    keywords: [
      "calculation rule",
      "payroll engine",
      "documentation",
      "part-time",
    ],
  },
  {
    id: "d-evaluatie",
    name: "2026 indexation campaign review",
    source: "SharePoint",
    location: "Marketing Benelux",
    ownerId: "e-yasmine",
    updatedAt: "2026-03-04",
    keywords: COMMS,
  },
  {
    id: "d-tone",
    name: "Tone of voice · customer communications",
    source: "SharePoint",
    location: "Marketing Benelux",
    ownerId: "e-hanne",
    updatedAt: "2026-06-11",
    keywords: [
      "communication",
      "customer communication",
      "newsletter",
      "content",
      "mailing",
    ],
  },
];

export const conversations: KnowledgeConversation[] = [
  {
    id: "c-attest",
    title: "Holiday certificate for a part-time employee",
    channel: "Teams",
    location: "#payroll-be",
    participantIds: ["e-emma", "e-jamie", "e-pieter"],
    lastActivity: days(-6),
    snippet:
      "When working hours change, we include both periods separately in the calculation.",
    keywords: [
      "holiday certificate",
      "part-time",
      "white-collar employee",
      "holiday pay",
    ],
  },
  {
    id: "c-faq",
    title: "The 2021 FAQ has been superseded",
    channel: "Outlook",
    location: "Payroll Belgium",
    participantIds: ["e-pieter", "e-emma"],
    lastActivity: days(-21),
    snippet:
      "Use only the playbook from now on. The old FAQ is no longer correct for white-collar employees.",
    keywords: [
      "final settlement",
      "termination of employment",
      "departure holiday pay",
      "white-collar employee",
    ],
  },
  {
    id: "c-afronding",
    title: "Rounding in holiday pay calculations",
    channel: "DevOps",
    location: "PR 1842 · payroll engine",
    participantIds: ["e-ines", "e-emma"],
    lastActivity: days(-3),
    snippet:
      "The calculation rule rounds each period separately, rather than the total. This keeps the certificate consistent.",
    keywords: [
      "calculation rule",
      "holiday pay",
      "part-time",
      "payroll engine",
      "pr 1842",
    ],
  },
  {
    id: "c-auth",
    title: "Accessing payroll data through the API",
    channel: "Teams",
    location: "#payroll-engine-dev",
    participantIds: ["e-bram", "e-ines", "e-noah"],
    lastActivity: days(-2),
    snippet:
      "Use the payroll.read scope and request access through the API portal.",
    keywords: ["api", "payroll data", "integration", "endpoint"],
  },
  {
    id: "c-pr",
    title: "Part-time holiday pay calculation rule",
    channel: "DevOps",
    location: "PR 1842 · payroll engine",
    participantIds: ["e-ines", "e-noah"],
    lastActivity: days(-3),
    snippet: "Can you add Emma's test cases before we merge?",
    keywords: [
      "calculation rule",
      "part-time",
      "pull request",
      "pr 1842",
      "test case",
    ],
  },
  {
    id: "c-werkte",
    title: "What worked in the indexation email?",
    channel: "Teams",
    location: "#marketing",
    participantIds: ["e-yasmine", "e-hanne", "e-tom"],
    lastActivity: days(-12),
    snippet:
      "A short checklist at the top performed much better than a lengthy explanation.",
    keywords: [
      "indexation",
      "campaign",
      "mailing",
      "newsletter",
      "communication",
    ],
  },
  {
    id: "c-webinar",
    title: "Customer feedback on the holiday pay webinar",
    channel: "Outlook",
    location: "Customer success",
    participantIds: ["e-tom", "e-pieter"],
    lastActivity: days(-30),
    snippet: "Customers mainly asked for examples of final settlements.",
    keywords: ["webinar", "final settlement", "holiday pay", "customer"],
  },
];

export const findEmployee = (id: string) => employees.find((e) => e.id === id);
export const findTeam = (id: string) => teams.find((t) => t.id === id);
export const findDocument = (id: string) => documents.find((d) => d.id === id);
export const findConversation = (id: string) =>
  conversations.find((c) => c.id === id);
