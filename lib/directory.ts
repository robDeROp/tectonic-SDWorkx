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

export type Team = { id: string; name: string; department: string };

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
  { id: "payroll-be", name: "Payroll België", department: "Customer care" },
  { id: "loonmotor", name: "Loonmotor", department: "Engineering" },
  { id: "juridisch", name: "Juridisch kenniscentrum", department: "Legal" },
  { id: "marketing", name: "Marketing Benelux", department: "Marketing" },
  { id: "success", name: "Customer success", department: "Customer care" },
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
    jobTitle: "Teamlead Payroll België",
    teamId: "payroll-be",
    outOfOffice: null,
  },
  {
    id: "e-lotte",
    upn: "lotte.maes@sdworx.example",
    displayName: "Lotte Maes",
    jobTitle: "Juridisch adviseur sociaal recht",
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
    jobTitle: "Marketeer",
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
  "vakantiegeld",
  "vertrekvakantiegeld",
  "eindafrekening",
  "uitdiensttreding",
  "uit dienst",
  "vakantieattest",
  "vakantiedagen",
  "ontslag",
  "bediende",
  "deeltijds",
];
const ENGINE = [
  "api",
  "loonmotor",
  "endpoint",
  "integratie",
  "rekenregel",
  "code",
  "pipeline",
  "devops",
  "deploy",
  "pull request",
  "loongegevens",
  "testomgeving",
];
const COMMS = [
  "campagne",
  "nieuwsbrief",
  "communicatie",
  "klantcommunicatie",
  "doelgroep",
  "marketing",
  "mailing",
  "webinar",
  "content",
  "indexering",
];

export const expertise: Expertise[] = [
  {
    employeeId: "e-emma",
    keywords: PAYROLL,
    weight: 94,
    signal:
      "Schreef het payroll playbook · beantwoordde 14 vergelijkbare vragen",
  },
  {
    employeeId: "e-pieter",
    keywords: [...PAYROLL, "checklist", "richtlijn"],
    weight: 82,
    signal: "Eigenaar van het project Eindafrekening 2.0",
  },
  {
    employeeId: "e-lotte",
    keywords: [...PAYROLL, "richtlijn", "regelgeving", "juridisch"],
    weight: 71,
    signal: "Volgt de regelgeving rond vakantiegeld op",
  },
  {
    employeeId: "e-jamie",
    keywords: PAYROLL,
    weight: 64,
    signal: "Verwerkt wekelijks eindafrekeningen",
  },
  {
    employeeId: "e-ines",
    keywords: ["vakantiegeld", "deeltijds", "rekenregel"],
    weight: 60,
    signal: "Bouwde de vakantiegeldberekening in de loonmotor",
  },
  {
    employeeId: "e-ines",
    keywords: ENGINE,
    weight: 92,
    signal: "Bouwde de berekeningsmodule · 38 pull requests",
  },
  {
    employeeId: "e-bram",
    keywords: [...ENGINE, "versiebeheer", "breaking"],
    weight: 86,
    signal: "Architect van de publieke API",
  },
  {
    employeeId: "e-noah",
    keywords: ENGINE,
    weight: 58,
    signal: "Werkt sinds kort aan Loonmotor v4",
  },
  {
    employeeId: "e-emma",
    keywords: ["rekenregel", "loonmotor"],
    weight: 52,
    signal: "Levert de functionele rekenregels aan",
  },
  {
    employeeId: "e-yasmine",
    keywords: COMMS,
    weight: 91,
    signal: "Leidde de campagne indexering 2026",
  },
  {
    employeeId: "e-hanne",
    keywords: COMMS,
    weight: 80,
    signal: "Beheert de nieuwsbrief voor HR-professionals",
  },
  {
    employeeId: "e-tom",
    keywords: COMMS,
    weight: 67,
    signal: "Kent de vragen die klanten echt stellen",
  },
  {
    employeeId: "e-pieter",
    keywords: ["nieuwsbrief", "webinar", "communicatie"],
    weight: 55,
    signal: "Controleert klantcommunicatie op payrollvlak",
  },
];

export const documents: KnowledgeDocument[] = [
  {
    id: "d-kader",
    name: "Vertrekvakantiegeld · regelgevend kader",
    source: "SharePoint",
    location: "Juridisch kenniscentrum",
    ownerId: "e-lotte",
    updatedAt: "2026-08-15",
    keywords: [...PAYROLL, "richtlijn", "regelgeving"],
  },
  {
    id: "d-playbook",
    name: "Payroll playbook · uitdiensttreding",
    source: "SharePoint",
    location: "Payroll België",
    ownerId: "e-emma",
    updatedAt: "2026-09-10",
    keywords: PAYROLL,
  },
  {
    id: "d-checklist",
    name: "Checklist eindafrekening",
    source: "OneDrive",
    location: "Emma Peeters",
    ownerId: "e-emma",
    updatedAt: "2026-09-30",
    keywords: [
      "eindafrekening",
      "checklist",
      "vakantiedagen",
      "uitdiensttreding",
    ],
  },
  {
    id: "d-architectuur",
    name: "Architectuur loonmotor v4",
    source: "DevOps Wiki",
    location: "Loonmotor",
    ownerId: "e-bram",
    updatedAt: "2026-09-02",
    keywords: [...ENGINE, "architectuur"],
  },
  {
    id: "d-api",
    name: "API-richtlijnen & versiebeheer",
    source: "DevOps Wiki",
    location: "Publieke payroll-API",
    ownerId: "e-bram",
    updatedAt: "2026-07-18",
    keywords: [
      "api",
      "endpoint",
      "integratie",
      "versiebeheer",
      "breaking",
      "loongegevens",
    ],
  },
  {
    id: "d-adr",
    name: "ADR-012 · Rekenregels als configuratie",
    source: "DevOps Wiki",
    location: "Loonmotor",
    ownerId: "e-ines",
    updatedAt: "2026-05-27",
    keywords: ["rekenregel", "loonmotor", "documenteren", "deeltijds"],
  },
  {
    id: "d-evaluatie",
    name: "Evaluatie campagne indexering 2026",
    source: "SharePoint",
    location: "Marketing Benelux",
    ownerId: "e-yasmine",
    updatedAt: "2026-03-04",
    keywords: COMMS,
  },
  {
    id: "d-tone",
    name: "Tone of voice · klantcommunicatie",
    source: "SharePoint",
    location: "Marketing Benelux",
    ownerId: "e-hanne",
    updatedAt: "2026-06-11",
    keywords: [
      "communicatie",
      "klantcommunicatie",
      "nieuwsbrief",
      "content",
      "mailing",
    ],
  },
];

export const conversations: KnowledgeConversation[] = [
  {
    id: "c-attest",
    title: "Vakantieattest bij een deeltijdse bediende",
    channel: "Teams",
    location: "#payroll-be",
    participantIds: ["e-emma", "e-jamie", "e-pieter"],
    lastActivity: days(-6),
    snippet:
      "Bij een wijziging van arbeidsregime nemen we beide periodes apart mee in de berekening.",
    keywords: ["vakantieattest", "deeltijds", "bediende", "vakantiegeld"],
  },
  {
    id: "c-faq",
    title: "De FAQ uit 2021 is vervangen",
    channel: "Outlook",
    location: "Payroll België",
    participantIds: ["e-pieter", "e-emma"],
    lastActivity: days(-21),
    snippet:
      "Gebruik vanaf nu enkel het playbook. De oude FAQ klopt niet meer voor bedienden.",
    keywords: [
      "eindafrekening",
      "uitdiensttreding",
      "vertrekvakantiegeld",
      "bediende",
    ],
  },
  {
    id: "c-afronding",
    title: "Afronding bij de vakantiegeldberekening",
    channel: "DevOps",
    location: "PR 1842 · loonmotor",
    participantIds: ["e-ines", "e-emma"],
    lastActivity: days(-3),
    snippet:
      "De rekenregel rondt per periode af, niet op het totaal. Zo blijft het attest consistent.",
    keywords: [
      "rekenregel",
      "vakantiegeld",
      "deeltijds",
      "loonmotor",
      "pr 1842",
    ],
  },
  {
    id: "c-auth",
    title: "Toegang tot loongegevens via de API",
    channel: "Teams",
    location: "#loonmotor-dev",
    participantIds: ["e-bram", "e-ines", "e-noah"],
    lastActivity: days(-2),
    snippet:
      "Gebruik de scope payroll.read en vraag toegang aan via het API-portaal.",
    keywords: ["api", "loongegevens", "integratie", "endpoint"],
  },
  {
    id: "c-pr",
    title: "Rekenregel vakantiegeld deeltijds",
    channel: "DevOps",
    location: "PR 1842 · loonmotor",
    participantIds: ["e-ines", "e-noah"],
    lastActivity: days(-3),
    snippet: "Kun je de testcases van Emma toevoegen voor we mergen?",
    keywords: [
      "rekenregel",
      "deeltijds",
      "pull request",
      "pr 1842",
      "testcases",
    ],
  },
  {
    id: "c-werkte",
    title: "Wat werkte bij de indexeringsmail?",
    channel: "Teams",
    location: "#marketing",
    participantIds: ["e-yasmine", "e-hanne", "e-tom"],
    lastActivity: days(-12),
    snippet:
      "Een korte checklist bovenaan deed het veel beter dan de uitgebreide uitleg.",
    keywords: [
      "indexering",
      "campagne",
      "mailing",
      "nieuwsbrief",
      "communicatie",
    ],
  },
  {
    id: "c-webinar",
    title: "Feedback klanten op het webinar vakantiegeld",
    channel: "Outlook",
    location: "Customer success",
    participantIds: ["e-tom", "e-pieter"],
    lastActivity: days(-30),
    snippet: "Klanten vroegen vooral naar voorbeelden van eindafrekeningen.",
    keywords: ["webinar", "eindafrekening", "vakantiegeld", "klanten"],
  },
];

export const findEmployee = (id: string) => employees.find((e) => e.id === id);
export const findTeam = (id: string) => teams.find((t) => t.id === id);
export const findDocument = (id: string) => documents.find((d) => d.id === id);
export const findConversation = (id: string) =>
  conversations.find((c) => c.id === id);
