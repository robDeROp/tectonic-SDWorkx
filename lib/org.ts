/*
 * Demo organisation behind the organogram proof of concept.
 * Everything is generated from a fixed seed, so the same 200 fictional people
 * appear on every render (server and client) without a database or migration.
 * None of these people, clients or projects exist. In a real rollout this data
 * would come from Entra ID (people, managers), HR (functions, history) and the
 * project tooling (DevOps, tickets), not from manual upkeep.
 */

export const ORG_TODAY = "2026-10-20";
const SEED = 20261020;
const EXEC = "directie";

export type Hue =
  "teal" | "coral" | "berry" | "sky" | "sunflower" | "moss" | "ink";

export interface Department {
  id: string;
  name: string;
  hue: Hue;
  mission: string;
  directorId: string;
  teamIds: string[];
}
export interface Team {
  id: string;
  name: string;
  departmentId: string;
  focus: string;
  founded: string;
  expertise: string[];
  managerId: string;
  memberIds: string[];
}
export interface ProjectMember {
  employeeId: string;
  role: string;
  from: string;
  to: string | null;
}
export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  summary: string;
  tags: string[];
  start: string;
  end: string | null;
  teamIds: string[];
  leadId: string;
  members: ProjectMember[];
}
/** One function in one team for a period. Team moves and promotions both start a new position. */
export interface Position {
  teamId: string;
  title: string;
  from: string;
  to: string | null;
}
export interface Employee {
  id: string;
  entraObjectId: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  email: string;
  location: string;
  title: string;
  departmentId: string;
  teamId: string;
  managerId: string | null;
  startDate: string;
  positions: Position[];
  projects: {
    projectId: string;
    role: string;
    from: string;
    to: string | null;
  }[];
}
export interface Org {
  employees: Employee[];
  departments: Department[];
  executive: Team;
  teams: Team[];
  projects: Project[];
  employee: (id: string) => Employee;
  team: (id: string) => Team;
  project: (id: string) => Project;
  department: (id: string) => Department;
}

/* ---------- Month arithmetic: dates are whole months, written as ISO days. ---------- */
const toMonth = (iso: string) =>
  Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const toIso = (month: number) =>
  `${Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}-01`;
const NOW = toMonth(ORG_TODAY);

/* ---------- Static shape of the company ---------- */
interface DepartmentSpec {
  id: string;
  name: string;
  hue: Hue;
  mission: string;
  directorTitle: string;
  managerTitle: string;
  locations: string[];
  projectRoles: string[];
}
const DEPARTMENTS: DepartmentSpec[] = [
  {
    id: "payroll-be",
    name: "Payroll België",
    hue: "teal",
    mission: "Correcte en tijdige verloning voor Belgische werkgevers.",
    directorTitle: "Directeur Payroll België",
    managerTitle: "Teamleider",
    locations: [
      "Antwerpen",
      "Gent",
      "Brussel",
      "Leuven",
      "Hasselt",
      "Kortrijk",
      "Luik",
    ],
    projectRoles: ["Payrollexpert", "Business analist", "Kernlid"],
  },
  {
    id: "payroll-int",
    name: "Payroll NL & Internationaal",
    hue: "coral",
    mission: "Verloning over de grens, van Utrecht tot multi-country.",
    directorTitle: "Directeur Payroll NL & Internationaal",
    managerTitle: "Teamleider",
    locations: ["Utrecht", "Amsterdam", "Antwerpen", "Brussel"],
    projectRoles: ["Landenexpert", "Payrollexpert", "Kernlid"],
  },
  {
    id: "hr",
    name: "HR Consultancy",
    hue: "berry",
    mission: "Advies over mensen, beleid en beloning.",
    directorTitle: "Directeur HR Consultancy",
    managerTitle: "Teamleider",
    locations: ["Antwerpen", "Gent", "Brussel", "Leuven"],
    projectRoles: ["Inhoudelijk expert", "Change lead", "Kernlid"],
  },
  {
    id: "engineering",
    name: "Product & Engineering",
    hue: "sky",
    mission: "Bouwt en beveiligt het platform achter elke loonbrief.",
    directorTitle: "CTO · Directeur Product & Engineering",
    managerTitle: "Engineering manager",
    locations: ["Antwerpen", "Gent", "Leuven", "Remote"],
    projectRoles: ["Developer", "Developer", "Tester", "Architect"],
  },
  {
    id: "data",
    name: "Data & AI",
    hue: "sunflower",
    mission: "Maakt data bruikbaar en zet AI verantwoord in.",
    directorTitle: "Chief Data Officer",
    managerTitle: "Teamlead",
    locations: ["Antwerpen", "Gent", "Leuven", "Remote"],
    projectRoles: ["Data engineer", "Analist", "ML-expert"],
  },
  {
    id: "operations",
    name: "Klantenservice & Operaties",
    hue: "moss",
    mission: "Helpt klanten verder en houdt de operatie draaiende.",
    directorTitle: "Directeur Klantenservice & Operaties",
    managerTitle: "Teamleider",
    locations: ["Antwerpen", "Gent", "Brussel", "Hasselt", "Kortrijk"],
    projectRoles: ["Klantexpert", "Key user", "Kernlid"],
  },
];

interface TeamSpec {
  id: string;
  name: string;
  dept: string;
  founded: number;
  focus: string;
  ladder: [string, string, string];
  expertise: string[];
}
const TEAMS: TeamSpec[] = [
  {
    id: "kmo-vl",
    name: "Payroll KMO Vlaanderen",
    dept: "payroll-be",
    founded: 2006,
    focus: "Verloning voor kmo's in Vlaanderen.",
    ladder: [
      "Junior payroll consultant",
      "Payroll consultant",
      "Senior payroll consultant",
    ],
    expertise: ["Belgische loonverwerking", "Paritaire comités", "Kmo-klanten"],
  },
  {
    id: "kmo-wb",
    name: "Payroll KMO Wallonië & Brussel",
    dept: "payroll-be",
    founded: 2009,
    focus: "Tweetalige verloning voor kmo's in Wallonië en Brussel.",
    ladder: [
      "Junior payroll consultant",
      "Payroll consultant",
      "Senior payroll consultant",
    ],
    expertise: [
      "Belgische loonverwerking",
      "Tweetalige dossiers",
      "Kmo-klanten",
    ],
  },
  {
    id: "enterprise",
    name: "Payroll Enterprise",
    dept: "payroll-be",
    founded: 2006,
    focus: "Complexe verloning voor grote werkgevers.",
    ladder: [
      "Payroll consultant enterprise",
      "Senior payroll consultant enterprise",
      "Lead payroll consultant",
    ],
    expertise: [
      "Grote ondernemingen",
      "Eindejaarsafsluiting",
      "Loonmotor-configuratie",
    ],
  },
  {
    id: "wetgeving",
    name: "Sociale Wetgeving",
    dept: "payroll-be",
    founded: 2007,
    focus: "Vertaalt nieuwe wetgeving naar loonregels.",
    ladder: [
      "Juridisch medewerker",
      "Juridisch adviseur sociaal recht",
      "Senior juridisch adviseur",
    ],
    expertise: ["Sociaal recht", "Wetgevingsmonitoring", "Vakantiegeld"],
  },
  {
    id: "payroll-nl",
    name: "Payroll Nederland",
    dept: "payroll-int",
    founded: 2008,
    focus: "Salarisadministratie voor Nederlandse werkgevers.",
    ladder: [
      "Junior salarisadministrateur",
      "Salarisadministrateur",
      "Senior salarisadviseur",
    ],
    expertise: [
      "Nederlandse loonheffingen",
      "Pensioenen (Wtp)",
      "Cao-toepassing",
    ],
  },
  {
    id: "global",
    name: "Global Payroll Hub",
    dept: "payroll-int",
    founded: 2019,
    focus: "Eén aanspreekpunt voor verloning in meerdere landen.",
    ladder: [
      "Global payroll analyst",
      "Global payroll specialist",
      "Senior global payroll specialist",
    ],
    expertise: ["Multi-country payroll", "Leveranciersbeheer", "Harmonisatie"],
  },
  {
    id: "expat",
    name: "Expat & Mobiliteit",
    dept: "payroll-int",
    founded: 2012,
    focus: "Detachering, expats en grensarbeid.",
    ladder: [
      "Mobility consultant",
      "Senior mobility consultant",
      "Mobility expert",
    ],
    expertise: ["Expatbelasting", "Detachering", "A1-formulieren"],
  },
  {
    id: "hr-advies",
    name: "HR Advies",
    dept: "hr",
    founded: 2006,
    focus: "Arbeidsrechtelijk en organisatorisch advies.",
    ladder: ["Junior HR consultant", "HR consultant", "Senior HR consultant"],
    expertise: ["Arbeidsrecht", "Verzuimbeleid", "Organisatieadvies"],
  },
  {
    id: "talent",
    name: "Talent & Performance",
    dept: "hr",
    founded: 2013,
    focus: "Groei, feedback en interne mobiliteit.",
    ladder: [
      "Talent specialist",
      "Talent consultant",
      "Senior talent consultant",
    ],
    expertise: [
      "Performance management",
      "Learning & development",
      "Interne mobiliteit",
    ],
  },
  {
    id: "reward",
    name: "Reward & Benefits",
    dept: "hr",
    founded: 2010,
    focus: "Beloningsbeleid en extralegale voordelen.",
    ladder: ["Reward analyst", "Reward specialist", "Senior reward consultant"],
    expertise: ["Verloningsbeleid", "Mobiliteitsbudget", "Loontransparantie"],
  },
  {
    id: "core",
    name: "Platform Core",
    dept: "engineering",
    founded: 2008,
    focus: "De loonmotor en het domeinmodel.",
    ladder: ["Software engineer", "Senior software engineer", "Staff engineer"],
    expertise: ["Loonmotor", "Java", "Domeinmodellering"],
  },
  {
    id: "mobile",
    name: "Mobile Apps",
    dept: "engineering",
    founded: 2014,
    focus: "Apps voor werknemers en managers.",
    ladder: [
      "Mobile developer",
      "Senior mobile developer",
      "Lead mobile developer",
    ],
    expertise: ["React Native", "UX-design", "Toegankelijkheid"],
  },
  {
    id: "api",
    name: "Integraties & API",
    dept: "engineering",
    founded: 2016,
    focus: "Koppelingen met klanten en partners.",
    ladder: [
      "Integration engineer",
      "Senior integration engineer",
      "Integration architect",
    ],
    expertise: ["API-design", "Peppol", "Boekhoudkoppelingen"],
  },
  {
    id: "qe",
    name: "Quality Engineering",
    dept: "engineering",
    founded: 2017,
    focus: "Bewaakt de kwaliteit van elke release.",
    ladder: ["Test engineer", "Senior test engineer", "QA lead"],
    expertise: [
      "Testautomatisering",
      "Regressietesten",
      "Loonberekeningsvalidatie",
    ],
  },
  {
    id: "cloud",
    name: "Cloud & Security",
    dept: "engineering",
    founded: 2016,
    focus: "Infrastructuur, identiteit en beveiliging.",
    ladder: ["Cloud engineer", "Senior cloud engineer", "Security architect"],
    expertise: ["Cloudinfrastructuur", "Informatiebeveiliging", "Entra ID"],
  },
  {
    id: "data-platform",
    name: "Data Platform",
    dept: "data",
    founded: 2015,
    focus: "Pijplijnen en het lakehouse.",
    ladder: ["Data engineer", "Senior data engineer", "Lead data engineer"],
    expertise: ["Datapijplijnen", "Lakehouse", "Datakwaliteit"],
  },
  {
    id: "analytics",
    name: "Analytics & Reporting",
    dept: "data",
    founded: 2017,
    focus: "Inzichten en rapportering voor klanten.",
    ladder: ["Data analist", "Senior data analist", "Analytics lead"],
    expertise: ["Dashboards", "HR-analytics", "Rapportering"],
  },
  {
    id: "ai",
    name: "Applied AI",
    dept: "data",
    founded: 2021,
    focus: "AI-toepassingen met mens in de lus.",
    ladder: ["ML engineer", "Senior ML engineer", "AI lead"],
    expertise: ["Taalmodellen", "Machine learning", "Kennisbeheer"],
  },
  {
    id: "cc-payroll",
    name: "Customer Care Payroll",
    dept: "operations",
    founded: 2006,
    focus: "Beantwoordt payrollvragen van klanten.",
    ladder: [
      "Klantenadviseur",
      "Senior klantenadviseur",
      "Expert klantenservice",
    ],
    expertise: [
      "Klantvragen payroll",
      "Ticketafhandeling",
      "Vertrekvakantiegeld",
    ],
  },
  {
    id: "cc-hr",
    name: "Customer Care HR",
    dept: "operations",
    founded: 2011,
    focus: "Beantwoordt HR-vragen van klanten.",
    ladder: [
      "Klantenadviseur HR",
      "Senior klantenadviseur HR",
      "Expert klantenservice HR",
    ],
    expertise: ["Klantvragen HR", "Ticketafhandeling", "Arbeidsreglementen"],
  },
  {
    id: "implementatie",
    name: "Implementatie & Onboarding",
    dept: "operations",
    founded: 2009,
    focus: "Brengt nieuwe klanten aan boord.",
    ladder: [
      "Implementatieconsultant",
      "Senior implementatieconsultant",
      "Lead implementatieconsultant",
    ],
    expertise: ["Klantmigraties", "Onboarding", "Projectmanagement"],
  },
  {
    id: "finance",
    name: "Finance & Facturatie",
    dept: "operations",
    founded: 2006,
    focus: "Facturatie, betalingen en financiële rapportering.",
    ladder: [
      "Financieel medewerker",
      "Financieel analist",
      "Senior financieel analist",
    ],
    expertise: ["Facturatie", "E-facturatie", "Financiële rapportering"],
  },
];

interface ProjectSpec {
  name: string;
  client: string;
  summary: string;
  tags: string[];
  start: string;
  end: string | null;
  teams: string[];
}
const PROJECTS: ProjectSpec[] = [
  /* Active */
  {
    name: "Loonmotor 2027",
    client: "Intern",
    summary: "Nieuwe generatie van de loonmotor met regels als configuratie.",
    tags: ["Loonmotor", "Sociaal recht"],
    start: "2025-02",
    end: null,
    teams: ["core", "wetgeving", "qe"],
  },
  {
    name: "Hunch kennisplatform",
    client: "Intern",
    summary: "Vindt bronnen en mensen achter elke klantvraag.",
    tags: ["Kennisbeheer", "Taalmodellen", "Ticketafhandeling"],
    start: "2026-03",
    end: null,
    teams: ["ai", "cc-payroll", "cloud"],
  },
  {
    name: "Migratie Brouwerij Van Eyck",
    client: "Brouwerij Van Eyck",
    summary: "Overstap van 2.400 werknemers naar ons platform.",
    tags: ["Klantmigraties", "Grote ondernemingen"],
    start: "2026-01",
    end: null,
    teams: ["enterprise", "implementatie"],
  },
  {
    name: "Indexering & loonschalen 2027",
    client: "Intern",
    summary: "Nieuwe barema's per paritair comité tijdig in productie.",
    tags: ["Paritaire comités", "Wetgevingsmonitoring"],
    start: "2026-06",
    end: null,
    teams: ["wetgeving", "kmo-vl", "kmo-wb"],
  },
  {
    name: "Loonbrief-app v3",
    client: "Intern",
    summary: "Toegankelijke app voor loonbrieven en verlof.",
    tags: ["React Native", "Toegankelijkheid"],
    start: "2025-09",
    end: null,
    teams: ["mobile", "qe"],
  },
  {
    name: "Open Partner API",
    client: "Intern",
    summary: "Publieke API voor boekhoud- en HR-partners.",
    tags: ["API-design", "Informatiebeveiliging"],
    start: "2025-05",
    end: null,
    teams: ["api", "cloud"],
  },
  {
    name: "Zero-trust toegang",
    client: "Intern",
    summary: "Elke toegang via Entra ID, met minimale rechten.",
    tags: ["Entra ID", "Informatiebeveiliging"],
    start: "2026-02",
    end: null,
    teams: ["cloud", "core"],
  },
  {
    name: "Lakehouse-migratie",
    client: "Intern",
    summary: "Van het oude datawarehouse naar één lakehouse.",
    tags: ["Lakehouse", "Datapijplijnen"],
    start: "2025-04",
    end: null,
    teams: ["data-platform", "analytics"],
  },
  {
    name: "Verzuimsignalen",
    client: "Zorgnet Leie",
    summary: "Vroege signalen van langdurig verzuim, met HR-advies.",
    tags: ["Machine learning", "Verzuimbeleid"],
    start: "2026-04",
    end: null,
    teams: ["ai", "hr-advies"],
  },
  {
    name: "Global payroll Benelux + DACH",
    client: "Retail Noord",
    summary: "Eén payrollproces voor vijf landen.",
    tags: ["Multi-country payroll", "Harmonisatie"],
    start: "2025-11",
    end: null,
    teams: ["global", "expat"],
  },
  {
    name: "EU-richtlijn loontransparantie",
    client: "Intern",
    summary: "Klanten klaarmaken voor de transparantieregels van 2026.",
    tags: ["Loontransparantie", "Sociaal recht"],
    start: "2025-06",
    end: null,
    teams: ["reward", "wetgeving", "hr-advies"],
  },
  {
    name: "Onboarding in 30 dagen",
    client: "Intern",
    summary: "Nieuwe klanten live binnen een maand.",
    tags: ["Onboarding", "Klantvragen HR"],
    start: "2026-01",
    end: null,
    teams: ["implementatie", "cc-hr"],
  },
  {
    name: "E-facturatie B2B",
    client: "Intern",
    summary: "Verplichte e-facturatie via Peppol.",
    tags: ["E-facturatie", "Peppol"],
    start: "2025-08",
    end: null,
    teams: ["finance", "api"],
  },
  {
    name: "Interne talentmarkt",
    client: "Intern",
    summary: "Medewerkers vinden interne projecten en mentors.",
    tags: ["Interne mobiliteit", "UX-design"],
    start: "2026-05",
    end: null,
    teams: ["talent", "mobile"],
  },
  {
    name: "Klantportaal vernieuwd",
    client: "Intern",
    summary: "Eén portaal voor vragen, documenten en status.",
    tags: ["Klantvragen payroll", "UX-design"],
    start: "2025-10",
    end: null,
    teams: ["cc-payroll", "core", "qe"],
  },
  {
    name: "Pensioenhervorming Wtp",
    client: "Bouwgroep Maasland",
    summary: "Overgang naar het nieuwe Nederlandse pensioenstelsel.",
    tags: ["Pensioenen (Wtp)", "Verloningsbeleid"],
    start: "2025-03",
    end: null,
    teams: ["payroll-nl", "reward"],
  },
  {
    name: "Flexi-jobs & studentenarbeid",
    client: "Intern",
    summary: "Correcte contingenten en aangiftes voor flexibele jobs.",
    tags: ["Belgische loonverwerking", "Klantvragen payroll"],
    start: "2026-02",
    end: null,
    teams: ["kmo-vl", "cc-payroll"],
  },
  {
    name: "Implementatie Logistiek Schelde",
    client: "Logistiek Schelde",
    summary: "Ploegenroosters en premies voor 900 werknemers.",
    tags: ["Klantmigraties", "Tweetalige dossiers"],
    start: "2026-07",
    end: null,
    teams: ["implementatie", "kmo-wb"],
  },
  {
    name: "Duurzaamheidsrapportering CSRD",
    client: "Intern",
    summary: "Sociale KPI's voor CSRD-rapporten van klanten.",
    tags: ["Rapportering", "Financiële rapportering"],
    start: "2025-12",
    end: null,
    teams: ["analytics", "finance"],
  },
  {
    name: "Testautomatisering loonmotor",
    client: "Intern",
    summary: "Duizenden loonscenario's automatisch vergeleken.",
    tags: ["Testautomatisering", "Loonberekeningsvalidatie"],
    start: "2025-01",
    end: null,
    teams: ["qe", "core", "enterprise"],
  },
  /* Finished */
  {
    name: "Uitbreiding Wallonië",
    client: "Intern",
    summary: "Nieuw kantoor en klantenportefeuille in Luik.",
    tags: ["Tweetalige dossiers", "Kmo-klanten"],
    start: "2010-03",
    end: "2011-09",
    teams: ["kmo-wb", "implementatie"],
  },
  {
    name: "Onboarding Brouwerij De Leie",
    client: "Brouwerij De Leie",
    summary: "Eerste enterprise-klant op het platform.",
    tags: ["Klantmigraties", "Grote ondernemingen"],
    start: "2012-01",
    end: "2013-04",
    teams: ["implementatie", "enterprise"],
  },
  {
    name: "Sociale balans automatisch",
    client: "Intern",
    summary: "Sociale balans rechtstreeks uit de loondata.",
    tags: ["Sociaal recht", "Loonmotor"],
    start: "2013-05",
    end: "2014-06",
    teams: ["wetgeving", "core"],
  },
  {
    name: "Digitale loonbrief",
    client: "Intern",
    summary: "Afscheid van de papieren loonbrief.",
    tags: ["Loonmotor", "Belgische loonverwerking"],
    start: "2014-02",
    end: "2015-05",
    teams: ["core", "kmo-vl"],
  },
  {
    name: "Loonbrief-app v1",
    client: "Intern",
    summary: "De eerste mobiele app.",
    tags: ["React Native", "UX-design"],
    start: "2015-01",
    end: "2016-03",
    teams: ["mobile"],
  },
  {
    name: "Datamigratie legacy HR",
    client: "Intern",
    summary: "Twintig jaar HR-data naar één bron.",
    tags: ["Datakwaliteit", "Klantmigraties"],
    start: "2016-02",
    end: "2017-06",
    teams: ["data-platform", "implementatie"],
  },
  {
    name: "GDPR-programma",
    client: "Intern",
    summary: "Privacy by design in processen en systemen.",
    tags: ["Informatiebeveiliging", "Arbeidsrecht"],
    start: "2017-03",
    end: "2018-05",
    teams: ["cloud", "hr-advies", "wetgeving"],
  },
  {
    name: "ISO 27001-certificering",
    client: "Intern",
    summary: "Certificering van het beveiligingsbeheer.",
    tags: ["Informatiebeveiliging", "Financiële rapportering"],
    start: "2018-01",
    end: "2019-03",
    teams: ["cloud", "finance"],
  },
  {
    name: "Dashboards v1",
    client: "Intern",
    summary: "Eerste HR-dashboards voor klanten.",
    tags: ["Dashboards", "HR-analytics"],
    start: "2018-04",
    end: "2019-06",
    teams: ["analytics", "data-platform"],
  },
  {
    name: "Mobiliteitsbudget",
    client: "Intern",
    summary: "Het mobiliteitsbudget in de loonmotor.",
    tags: ["Mobiliteitsbudget", "Verloningsbeleid"],
    start: "2019-02",
    end: "2020-03",
    teams: ["reward", "enterprise"],
  },
  {
    name: "Loonmotor naar de cloud",
    client: "Intern",
    summary: "De loonmotor verhuist naar de cloud.",
    tags: ["Cloudinfrastructuur", "Loonmotor"],
    start: "2019-04",
    end: "2021-06",
    teams: ["core", "cloud"],
  },
  {
    name: "Tijdelijke werkloosheid corona",
    client: "Intern",
    summary: "Crisisregelingen binnen enkele dagen verwerkt.",
    tags: ["Sociaal recht", "Klantvragen payroll"],
    start: "2020-03",
    end: "2020-12",
    teams: ["wetgeving", "kmo-vl", "cc-payroll"],
  },
  {
    name: "Loonbrief-app v2",
    client: "Intern",
    summary: "Verlof, documenten en meldingen in de app.",
    tags: ["React Native", "Toegankelijkheid"],
    start: "2020-06",
    end: "2022-02",
    teams: ["mobile", "qe"],
  },
  {
    name: "Telewerkvergoeding",
    client: "Intern",
    summary: "Thuiswerkvergoedingen correct en fiscaal vrij.",
    tags: ["Verloningsbeleid", "Belgische loonverwerking"],
    start: "2021-01",
    end: "2021-09",
    teams: ["reward", "kmo-wb"],
  },
  {
    name: "Expat tax calculator",
    client: "Intern",
    summary: "Simulaties voor expatverloning.",
    tags: ["Expatbelasting", "Dashboards"],
    start: "2021-04",
    end: "2022-05",
    teams: ["expat", "analytics"],
  },
  {
    name: "Single sign-on met Entra ID",
    client: "Intern",
    summary: "Eén login voor klanten en medewerkers.",
    tags: ["Entra ID", "API-design"],
    start: "2022-01",
    end: "2023-02",
    teams: ["cloud", "api"],
  },
  {
    name: "Chatbot klantenservice",
    client: "Intern",
    summary: "Eerste AI-assistent voor veelgestelde vragen.",
    tags: ["Taalmodellen", "Klantvragen payroll"],
    start: "2022-06",
    end: "2023-08",
    teams: ["ai", "cc-payroll", "cc-hr"],
  },
  {
    name: "Nieuwe performancecyclus",
    client: "Intern",
    summary: "Doorlopende feedback in plaats van jaargesprekken.",
    tags: ["Performance management", "Learning & development"],
    start: "2022-09",
    end: "2023-06",
    teams: ["talent", "hr-advies"],
  },
  {
    name: "Wtp-impactanalyse",
    client: "Intern",
    summary: "Impact van de pensioenwet op Nederlandse klanten.",
    tags: ["Pensioenen (Wtp)", "Cao-toepassing"],
    start: "2023-03",
    end: "2024-04",
    teams: ["payroll-nl"],
  },
  {
    name: "Peppol-koppeling",
    client: "Intern",
    summary: "Eerste e-facturen via het Peppol-netwerk.",
    tags: ["Peppol", "Facturatie"],
    start: "2024-01",
    end: "2025-02",
    teams: ["finance", "api"],
  },
  {
    name: "Eindejaarsafsluiting zonder stress",
    client: "Intern",
    summary: "Controles en tooling voor de jaarafsluiting.",
    tags: ["Eindejaarsafsluiting", "Testautomatisering"],
    start: "2024-03",
    end: "2025-01",
    teams: ["enterprise", "qe"],
  },
  {
    name: "Multi-country pilot",
    client: "Retail Noord",
    summary: "Eerste klant op de Global Payroll Hub.",
    tags: ["Multi-country payroll", "Leveranciersbeheer"],
    start: "2023-05",
    end: "2024-09",
    teams: ["global", "payroll-nl"],
  },
];

const FIRST_NAMES = [
  "Lotte",
  "Wout",
  "Elise",
  "Jonas",
  "Fien",
  "Arne",
  "Nina",
  "Pieter",
  "Hanne",
  "Stijn",
  "Sarah",
  "Bram",
  "Lien",
  "Thomas",
  "Eline",
  "Ruben",
  "Marie",
  "Kobe",
  "Julie",
  "Lars",
  "Femke",
  "Sander",
  "Amber",
  "Jens",
  "Ines",
  "Tom",
  "Charlotte",
  "Dries",
  "Laura",
  "Matthias",
  "Emma",
  "Simon",
  "Noor",
  "Niels",
  "Yasmine",
  "Karim",
  "Amira",
  "Mehmet",
  "Sofia",
  "Lucas",
  "Camille",
  "Hugo",
  "Manon",
  "Louis",
  "Chloé",
  "Mathis",
  "Anouk",
  "Daan",
  "Sanne",
  "Joris",
  "Evi",
  "Tibo",
  "Jana",
  "Robbe",
  "Margot",
  "Seppe",
  "Zoë",
  "Wannes",
  "Lore",
  "Gilles",
  "Aïsha",
  "Omar",
  "Leen",
  "Koen",
  "Griet",
  "Bart",
  "Veerle",
  "Dirk",
  "An",
  "Kristof",
  "Jasper",
  "Ilse",
  "Maarten",
  "Nathalie",
  "Pauline",
  "Rik",
  "Saar",
  "Toon",
  "Vic",
  "Xander",
];
const LAST_NAMES = [
  "Peeters",
  "Janssens",
  "Maes",
  "Jacobs",
  "Mertens",
  "Willems",
  "Claes",
  "Goossens",
  "Wouters",
  "De Smet",
  "Dubois",
  "Lambert",
  "Dupont",
  "Hermans",
  "Michiels",
  "Aerts",
  "Vermeulen",
  "Van Damme",
  "De Backer",
  "Lemmens",
  "Bogaert",
  "Verstraete",
  "Desmet",
  "Martens",
  "Coppens",
  "Van den Broeck",
  "Smets",
  "Declercq",
  "Vandenberghe",
  "De Vos",
  "Pauwels",
  "Verhoeven",
  "Bakker",
  "De Jong",
  "Visser",
  "Mulder",
  "El Amrani",
  "Benali",
  "Yilmaz",
  "Kaya",
  "Leclercq",
  "Renard",
  "Simon",
  "Laurent",
  "Moreau",
  "Vos",
  "Hendrickx",
  "Cools",
  "Segers",
  "Vermeiren",
  "Van Acker",
  "Thys",
  "Wuyts",
  "Baert",
  "Moens",
  "Verbeke",
  "Hoste",
  "Devos",
  "Callens",
  "Vanhove",
];

/* ---------- Seeded randomness ---------- */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildOrg(): Org {
  const random = mulberry32(SEED);
  const int = (min: number, max: number) =>
    min + Math.floor(random() * (max - min + 1));
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];
  const chance = (p: number) => random() < p;
  const shuffle = <T>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join(
      "",
    );

  const teamSpec = new Map(TEAMS.map((t) => [t.id, t]));
  const deptSpec = new Map(DEPARTMENTS.map((d) => [d.id, d]));
  const founded = (teamId: string) =>
    teamId === EXEC ? 0 : (teamSpec.get(teamId)?.founded ?? 2006) * 12;

  /* Unique names */
  const usedNames = new Set<string>();
  const newPerson = (departmentId: string) => {
    let first = "";
    let last = "";
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
    } while (usedNames.has(`${first} ${last}`));
    usedNames.add(`${first} ${last}`);
    const slug = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z]+/g, "");
    const lastParts = last.split(" ");
    const location = pick(
      deptSpec.get(departmentId)?.locations ?? ["Antwerpen"],
    );
    return {
      firstName: first,
      lastName: last,
      name: `${first} ${last}`,
      initials:
        `${first[0]}${lastParts[lastParts.length - 1][0]}`.toUpperCase(),
      email: `${slug(first)}.${slug(last)}@hunch-demo.test`,
      location,
      entraObjectId: `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(["8", "9", "a", "b"])}${hex(3)}-${hex(12)}`,
    };
  };

  /* A team other than `exclude` that existed at `at`, preferring the same department. */
  const otherTeam = (exclude: string, at: number) => {
    const dept = teamSpec.get(exclude)?.dept;
    const open = TEAMS.filter((t) => t.id !== exclude && t.founded * 12 <= at);
    const same = open.filter((t) => t.dept === dept);
    const pool = same.length && chance(0.7) ? same : open;
    return pool.length ? pick(pool).id : null;
  };

  type Stint = { teamId: string; from: number; to: number };
  /** Team stints between start and end that finish in `finalTeam`. */
  const teamStints = (
    start: number,
    end: number,
    finalTeam: string,
  ): Stint[] => {
    let moves = 0;
    if (end - start > 36 && chance(0.45)) moves++;
    if (end - start > 96 && chance(0.35)) moves++;
    const stints: Stint[] = [];
    let to = end;
    let team = finalTeam;
    for (;;) {
      const earliest = Math.max(start, founded(team));
      if (moves > 0 || earliest > start) {
        const lo = Math.max(earliest, start + 12);
        const hi = to - 12;
        if (lo <= hi) {
          const from = moves > 0 ? int(lo, hi) : int(lo, Math.min(hi, lo + 18));
          const previous = otherTeam(team, from - 12);
          if (previous) {
            stints.unshift({ teamId: team, from, to });
            to = from;
            team = previous;
            moves = Math.max(0, moves - 1);
            continue;
          }
        }
      }
      stints.unshift({ teamId: team, from: Math.min(earliest, to - 1), to });
      return stints;
    }
  };

  type MonthPosition = {
    teamId: string;
    title: string;
    from: number;
    to: number | null;
  };
  /** Member career: team stints plus promotions along the team's ladder. */
  const memberCareer = (
    start: number,
    end: number,
    finalTeam: string,
  ): MonthPosition[] => {
    const stints = teamStints(start, end, finalTeam);
    const begin = stints[0].from;
    const entry = chance(0.15) ? 2 : chance(0.35) ? 1 : 0;
    const promotions: number[] = [];
    let at = begin;
    for (let level = entry; level < 2; level++) {
      at += level === 0 ? int(18, 32) : int(40, 70);
      promotions.push(at);
    }
    const levelAt = (month: number) =>
      entry + promotions.filter((p) => p <= month).length;
    const cuts = [
      ...new Set([
        begin,
        ...stints.map((s) => s.from),
        ...promotions.filter((p) => p > begin && p < end),
      ]),
    ].sort((a, b) => a - b);
    const result: MonthPosition[] = [];
    cuts.forEach((from, i) => {
      const stint =
        stints.find((s) => s.from <= from && from < s.to) ??
        stints[stints.length - 1];
      const title = teamSpec.get(stint.teamId)!.ladder[levelAt(from)];
      const last = result[result.length - 1];
      if (last && last.teamId === stint.teamId && last.title === title) return;
      if (last) last.to = from;
      result.push({
        teamId: stint.teamId,
        title,
        from,
        to: i === cuts.length - 1 ? end : null,
      });
    });
    result[result.length - 1].to = end;
    return result;
  };

  type Draft = ReturnType<typeof newPerson> & {
    id: string;
    departmentId: string;
    teamId: string;
    managerId: string | null;
    positions: MonthPosition[];
  };
  const drafts: Draft[] = [];
  let counter = 0;
  const addPerson = (
    departmentId: string,
    teamId: string,
    positions: MonthPosition[],
  ) => {
    const draft: Draft = {
      ...newPerson(departmentId),
      id: `m${String(++counter).padStart(3, "0")}`,
      departmentId,
      teamId,
      managerId: null,
      positions,
    };
    drafts.push(draft);
    return draft;
  };
  /** Month from which a team's lead role is free, so lead periods never overlap. */
  const leadFreeFrom = new Map<string, number>();
  const managerTitle = (teamId: string) => {
    const spec = teamSpec.get(teamId)!;
    return `${deptSpec.get(spec.dept)!.managerTitle} ${spec.name}`;
  };
  /** Earlier career of someone who led `teamId` from `from` until `to`. */
  const leadCareer = (
    start: number,
    teamId: string,
    from: number,
    to: number,
  ) => {
    const ownTeam = chance(0.6)
      ? teamId
      : (otherTeam(teamId, from - 24) ?? teamId);
    leadFreeFrom.set(teamId, to);
    return [
      ...memberCareer(start, from, ownTeam),
      { teamId, title: managerTitle(teamId), from, to } as MonthPosition,
    ];
  };

  /* CEO: once a director, before that a team lead. */
  const ceoDept = "payroll-be";
  const ceoStart = toMonth("2007-09-01");
  const ceoSince = toMonth("2018-01-01");
  const ceoDirector = toMonth("2013-04-01");
  const ceoLead = int(ceoStart + 40, ceoDirector - 18);
  const ceo = addPerson(EXEC, EXEC, [
    ...leadCareer(ceoStart, "enterprise", ceoLead, ceoDirector),
    {
      teamId: EXEC,
      title: deptSpec.get(ceoDept)!.directorTitle,
      from: ceoDirector,
      to: ceoSince,
    },
    {
      teamId: EXEC,
      title: "Chief Executive Officer",
      from: ceoSince,
      to: null,
    },
  ]);

  /* Directors: each led a team in their department before. */
  const directors = new Map<string, Draft>();
  for (const dept of DEPARTMENTS) {
    const start = NOW - int(110, 220);
    const since = Math.max(
      int(start + 60, NOW - 10),
      dept.id === ceoDept ? ceoSince : 0,
    );
    const ledTeams = TEAMS.filter(
      (t) =>
        t.dept === dept.id &&
        t.founded * 12 <= since - 24 &&
        (leadFreeFrom.get(t.id) ?? 0) <= since - 30,
    );
    const led = pick(
      ledTeams.length ? ledTeams : TEAMS.filter((t) => t.dept === dept.id),
    );
    const earliestLead = Math.max(
      start + 30,
      led.founded * 12,
      leadFreeFrom.get(led.id) ?? 0,
    );
    const leadFrom = int(Math.min(earliestLead, since - 12), since - 12);
    const director = addPerson(dept.id, EXEC, [
      ...leadCareer(start, led.id, leadFrom, since),
      { teamId: EXEC, title: dept.directorTitle, from: since, to: null },
    ]);
    director.managerId = ceo.id;
    directors.set(dept.id, director);
  }

  /* Team managers, then 171 members spread over the 22 teams (200 people in total). */
  const sizes = TEAMS.map(() => 7);
  for (
    let extra = 200 - 1 - DEPARTMENTS.length - TEAMS.length - 7 * TEAMS.length;
    extra > 0;
  ) {
    const i = int(0, TEAMS.length - 1);
    if (sizes[i] < 10) {
      sizes[i]++;
      extra--;
    }
  }
  const managers = new Map<string, Draft>();
  for (const spec of TEAMS) {
    const start = NOW - int(48, 210);
    const earliest = Math.max(
      start + 30,
      spec.founded * 12,
      leadFreeFrom.get(spec.id) ?? 0,
    );
    const since = int(Math.min(earliest, NOW - 4), NOW - 4);
    const lead = leadCareer(start, spec.id, since, NOW);
    lead[lead.length - 1].to = null;
    const manager = addPerson(spec.dept, spec.id, lead);
    manager.managerId = directors.get(spec.dept)!.id;
    managers.set(spec.id, manager);
  }
  TEAMS.forEach((spec, i) => {
    for (let n = 0; n < sizes[i]; n++) {
      const tenure = 1 + Math.floor(Math.pow(random(), 1.5) * 220);
      const career = memberCareer(NOW - tenure, NOW, spec.id);
      career[career.length - 1].to = null;
      const member = addPerson(spec.dept, spec.id, career);
      member.managerId = managers.get(spec.id)!.id;
    }
  });

  /* Projects: staffed with people who were in an involved team during the project. */
  const stintsOf = (draft: Draft) => {
    const stints: Stint[] = [];
    for (const p of draft.positions) {
      const to = p.to ?? NOW + 1;
      const last = stints[stints.length - 1];
      if (last && last.teamId === p.teamId && last.to === p.from) last.to = to;
      else stints.push({ teamId: p.teamId, from: p.from, to });
    }
    return stints;
  };
  const draftStints = new Map(drafts.map((d) => [d.id, stintsOf(d)]));
  type MonthMember = {
    employeeId: string;
    role: string;
    from: number;
    to: number | null;
  };
  const projectMembers: MonthMember[][] = PROJECTS.map(() => []);
  const leads: string[] = [];
  PROJECTS.forEach((spec, index) => {
    const start = toMonth(`${spec.start}-01`);
    const end = spec.end ? toMonth(`${spec.end}-01`) : null;
    const members = projectMembers[index];
    const staff = (matches: (teamId: string) => boolean, count: number) => {
      const candidates = drafts.flatMap((d) =>
        (draftStints.get(d.id) ?? [])
          .filter(
            (s) =>
              matches(s.teamId) && s.from < (end ?? NOW + 1) && s.to > start,
          )
          .map((s) => ({ draft: d, stint: s })),
      );
      for (const { draft, stint } of shuffle(candidates).slice(0, count)) {
        if (members.some((m) => m.employeeId === draft.id)) continue;
        const to = Math.min(end ?? NOW + 1, stint.to);
        const dept = teamSpec.get(stint.teamId)?.dept ?? draft.departmentId;
        members.push({
          employeeId: draft.id,
          role: pick(deptSpec.get(dept)?.projectRoles ?? ["Kernlid"]),
          from: Math.max(start, stint.from),
          to: to > NOW ? null : to,
        });
      }
    };
    for (const teamId of spec.teams)
      staff((t) => t === teamId, end ? int(2, 4) : int(3, 5));
    /* Small early teams: borrow people from the same department at that time. */
    const dept = teamSpec.get(spec.teams[0])!.dept;
    if (members.length < 2)
      staff((t) => teamSpec.get(t)?.dept === dept, 3 - members.length);
    const pool = members.filter((m) => (end ? true : m.to === null));
    const leadMember =
      pool.find((m) => managers.get(spec.teams[0])?.id === m.employeeId) ??
      pool.find((m) =>
        /Senior|Lead|Staff|Expert|architect/i.test(
          drafts.find((d) => d.id === m.employeeId)!.positions.at(-1)!.title,
        ),
      ) ??
      pool[0];
    leadMember.role = "Projectleider";
    leads.push(leadMember.employeeId);
  });
  /* Everyone on the floor works on at least one active project. */
  const activeIndexes = PROJECTS.map((p, i) => (p.end ? -1 : i)).filter(
    (i) => i >= 0,
  );
  for (const draft of drafts) {
    if (draft.teamId === EXEC) continue;
    const busy = activeIndexes.some((i) =>
      projectMembers[i].some((m) => m.employeeId === draft.id && m.to === null),
    );
    if (busy) continue;
    const own = activeIndexes.filter((i) =>
      PROJECTS[i].teams.includes(draft.teamId),
    );
    const sameDept = activeIndexes.filter((i) =>
      PROJECTS[i].teams.some(
        (t) => teamSpec.get(t)!.dept === draft.departmentId,
      ),
    );
    const options = own.length ? own : sameDept;
    if (!options.length) continue;
    const i = pick(options);
    const currentStint = draftStints.get(draft.id)!.at(-1)!;
    projectMembers[i].push({
      employeeId: draft.id,
      role: pick(deptSpec.get(draft.departmentId)!.projectRoles),
      from: Math.max(toMonth(`${PROJECTS[i].start}-01`), currentStint.from),
      to: null,
    });
  }
  /* Directors sponsor active projects in their department; the CEO sponsors Hunch. */
  for (const [deptId, director] of directors) {
    const owned = activeIndexes.filter(
      (i) => teamSpec.get(PROJECTS[i].teams[0])!.dept === deptId,
    );
    for (const i of shuffle(owned).slice(0, 2)) {
      projectMembers[i].push({
        employeeId: director.id,
        role: "Sponsor",
        from: Math.max(
          toMonth(`${PROJECTS[i].start}-01`),
          director.positions.at(-1)!.from,
        ),
        to: null,
      });
    }
  }
  projectMembers[1].push({
    employeeId: ceo.id,
    role: "Sponsor",
    from: toMonth("2026-03-01"),
    to: null,
  });

  /* ---------- Assemble the public shape ---------- */
  const projects: Project[] = PROJECTS.map((spec, i) => ({
    id: `p${String(i + 1).padStart(2, "0")}`,
    code: `PRJ-${spec.start.slice(2, 4)}${String(i + 1).padStart(2, "0")}`,
    name: spec.name,
    client: spec.client,
    summary: spec.summary,
    tags: spec.tags,
    start: `${spec.start}-01`,
    end: spec.end ? `${spec.end}-01` : null,
    teamIds: spec.teams,
    leadId: leads[i],
    members: projectMembers[i].map((m) => ({
      employeeId: m.employeeId,
      role: m.role,
      from: toIso(m.from),
      to: m.to === null ? null : toIso(m.to),
    })),
  }));
  const employees: Employee[] = drafts.map((d) => {
    const positions = d.positions.map((p) => ({
      teamId: p.teamId,
      title: p.title,
      from: toIso(p.from),
      to: p.to === null ? null : toIso(p.to),
    }));
    return {
      id: d.id,
      entraObjectId: d.entraObjectId,
      firstName: d.firstName,
      lastName: d.lastName,
      name: d.name,
      initials: d.initials,
      email: d.email,
      location: d.location,
      title: positions.at(-1)!.title,
      departmentId: d.departmentId,
      teamId: d.teamId,
      managerId: d.managerId,
      startDate: positions[0].from,
      positions,
      projects: projects
        .flatMap((p) =>
          p.members
            .filter((m) => m.employeeId === d.id)
            .map((m) => ({
              projectId: p.id,
              role: m.role,
              from: m.from,
              to: m.to,
            })),
        )
        .sort((a, b) => b.from.localeCompare(a.from)),
    };
  });
  const teams: Team[] = TEAMS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    departmentId: spec.dept,
    focus: spec.focus,
    founded: `${spec.founded}-01-01`,
    expertise: spec.expertise,
    managerId: managers.get(spec.id)!.id,
    memberIds: drafts
      .filter((d) => d.teamId === spec.id && d.id !== managers.get(spec.id)!.id)
      .map((d) => d.id),
  }));
  const executive: Team = {
    id: EXEC,
    name: "Directiecomité",
    departmentId: EXEC,
    focus: "Strategie en richting van het bedrijf.",
    founded: "2006-01-01",
    expertise: ["Strategie", "Leiderschap"],
    managerId: ceo.id,
    memberIds: [...directors.values()].map((d) => d.id),
  };
  const departments: Department[] = [
    {
      id: EXEC,
      name: "Directie",
      hue: "ink",
      mission: "Strategie en richting van het bedrijf.",
      directorId: ceo.id,
      teamIds: [EXEC],
    },
    ...DEPARTMENTS.map((d) => ({
      id: d.id,
      name: d.name,
      hue: d.hue,
      mission: d.mission,
      directorId: directors.get(d.id)!.id,
      teamIds: TEAMS.filter((t) => t.dept === d.id).map((t) => t.id),
    })),
  ];
  const lookup = <T extends { id: string }>(items: T[], kind: string) => {
    const map = new Map(items.map((item) => [item.id, item]));
    return (id: string) => {
      const item = map.get(id);
      if (!item) throw new Error(`Onbekende ${kind}: ${id}`);
      return item;
    };
  };
  return {
    employees,
    departments,
    executive,
    teams,
    projects,
    employee: lookup(employees, "medewerker"),
    team: lookup([executive, ...teams], "team"),
    project: lookup(projects, "project"),
    department: lookup(departments, "afdeling"),
  };
}

export const org = buildOrg();

/* ---------- Derived context: computed from the data, never maintained by hand ---------- */

/** Whole months between two ISO dates. */
const monthsBetween = (from: string, to: string = ORG_TODAY) =>
  Math.max(0, toMonth(to) - toMonth(from));

export function tenureLabel(from: string, to: string = ORG_TODAY) {
  const months = monthsBetween(from, to);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return rest <= 1 ? "1 maand" : `${rest} maanden`;
  const yearLabel = `${years} jaar`;
  return rest ? `${yearLabel}, ${rest} mnd` : yearLabel;
}

const MONTHS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];
/** Locale-independent month label, identical on server and client. */
export const monthLabel = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Direct reports: people whose manager is this person. */
export const directReports = (employee: Employee) =>
  org.employees.filter((e) => e.managerId === employee.id);

/** Team stints: consecutive positions in the same team, merged. */
export function teamHistory(employee: Employee) {
  const stints: {
    teamId: string;
    from: string;
    to: string | null;
    titles: string[];
  }[] = [];
  for (const p of employee.positions) {
    const last = stints[stints.length - 1];
    if (last && last.teamId === p.teamId && last.to === p.from) {
      last.to = p.to;
      if (!last.titles.includes(p.title)) last.titles.push(p.title);
    } else
      stints.push({
        teamId: p.teamId,
        from: p.from,
        to: p.to,
        titles: [p.title],
      });
  }
  return stints;
}

export type TimelineKind = "join" | "role" | "team" | "project";
export interface TimelineEvent {
  date: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  projectId?: string;
  teamId?: string;
}
/** Career events, newest first. */
export function timeline(employee: Employee): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  employee.positions.forEach((p, i) => {
    const team = org.team(p.teamId);
    if (i === 0) {
      events.push({
        date: p.from,
        kind: "join",
        title: "In dienst",
        detail: `${p.title} · ${team.name}`,
        teamId: p.teamId,
      });
      return;
    }
    const previous = employee.positions[i - 1];
    if (p.teamId === EXEC)
      events.push({
        date: p.from,
        kind: "role",
        title: p.title,
        detail:
          previous.teamId === EXEC
            ? `Was ${previous.title}`
            : "Lid van het Directiecomité",
        teamId: p.teamId,
      });
    else if (previous.teamId !== p.teamId)
      events.push({
        date: p.from,
        kind: "team",
        title: `Naar ${team.name}`,
        detail:
          previous.title === p.title
            ? `Vanuit ${org.team(previous.teamId).name}`
            : `Nieuwe functie: ${p.title}`,
        teamId: p.teamId,
      });
    else
      events.push({
        date: p.from,
        kind: "role",
        title: p.title,
        detail: `Was ${previous.title}`,
        teamId: p.teamId,
      });
  });
  for (const assignment of employee.projects) {
    const project = org.project(assignment.projectId);
    events.push({
      date: assignment.from,
      kind: "project",
      title: project.name,
      detail: `${assignment.role}${assignment.to ? ` · tot ${monthLabel(assignment.to)}` : " · loopt nog"}`,
      projectId: project.id,
    });
  }
  return events.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || kindOrder[a.kind] - kindOrder[b.kind],
  );
}
const kindOrder: Record<TimelineKind, number> = {
  project: 0,
  role: 1,
  team: 2,
  join: 3,
};

const overlap = (
  aFrom: string,
  aTo: string | null,
  bFrom: string,
  bTo: string | null,
) =>
  Math.max(
    0,
    Math.min(toMonth(aTo ?? ORG_TODAY), toMonth(bTo ?? ORG_TODAY)) -
      Math.max(toMonth(aFrom), toMonth(bFrom)),
  );

/** People this employee actually worked with: shared projects weigh more than shared team time. */
export function collaborators(employee: Employee, limit = 6) {
  const scores = new Map<
    string,
    { projects: Set<string>; teamMonths: number }
  >();
  const entry = (id: string) => {
    if (!scores.has(id)) scores.set(id, { projects: new Set(), teamMonths: 0 });
    return scores.get(id)!;
  };
  for (const mine of employee.projects) {
    for (const other of org.project(mine.projectId).members) {
      if (other.employeeId === employee.id) continue;
      if (overlap(mine.from, mine.to, other.from, other.to) > 0)
        entry(other.employeeId).projects.add(mine.projectId);
    }
  }
  const mine = teamHistory(employee);
  for (const other of org.employees) {
    if (other.id === employee.id) continue;
    for (const a of mine)
      for (const b of teamHistory(other))
        if (a.teamId === b.teamId) {
          const months = overlap(a.from, a.to, b.from, b.to);
          if (months) entry(other.id).teamMonths += months;
        }
  }
  return [...scores.entries()]
    .map(([id, s]) => ({
      employee: org.employee(id),
      sharedProjects: [...s.projects],
      teamMonths: s.teamMonths,
      score: s.projects.size * 24 + s.teamMonths,
    }))
    .filter((c) => c.sharedProjects.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Expertise inferred from teams and projects, with where each signal came from. */
export function expertise(employee: Employee, limit = 6) {
  const tags = new Map<string, { projects: number; teams: number }>();
  const add = (tag: string, key: "projects" | "teams") => {
    const current = tags.get(tag) ?? { projects: 0, teams: 0 };
    current[key]++;
    tags.set(tag, current);
  };
  for (const stint of teamHistory(employee))
    for (const tag of org.team(stint.teamId).expertise) add(tag, "teams");
  for (const assignment of employee.projects)
    for (const tag of org.project(assignment.projectId).tags)
      add(tag, "projects");
  return [...tags.entries()]
    .map(([tag, s]) => ({ tag, ...s, score: s.projects * 2 + s.teams }))
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
