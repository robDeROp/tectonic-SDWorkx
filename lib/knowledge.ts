/*
 * The kennisgraaf: one connected picture of who knows what.
 *
 * Built from the live data the app already has: the Entra-shaped directory
 * (people, teams, documents, conversations), the hunches with the context
 * Hunch linked to them, and the customer questions with their source
 * documents. Pure: no database access, so it is easy to test.
 */
import {
  conversations,
  documents,
  employees,
  expertise,
  findEmployee,
  teams,
  type Employee,
} from "./directory";
import { findContext, personView } from "./hunches";
import { hunchStatusLabel, statusLabel } from "./client";
import type {
  ContextLink,
  Freshness,
  GraphItem,
  GraphPerson,
  GraphTopic,
  GraphUnit,
  KnowledgeGraph,
  KnowledgeRel,
} from "./types";

export type KnowledgeSource = {
  hunches: {
    id: string;
    number: number;
    title: string;
    workingOn: string;
    status: string;
    source: string;
    sourceLabel: string | null;
    authorId: string;
    updatedAt: Date;
  }[];
  hunchLinks: (ContextLink & { hunchId: string })[];
  helpCalls: { hunchId: string; recipientId: string; state: string }[];
  hunchMessages: { hunchId: string; authorId: string | null }[];
  tickets: {
    id: string;
    number: number;
    customer: string;
    company: string;
    subject: string;
    question: string;
    status: string;
    updatedAt: Date;
  }[];
  ticketDocuments: {
    id: string;
    ticketId: string;
    name: string;
    kind: string;
    date: string | null;
    content: string;
    fictional: boolean;
    createdAt: Date;
  }[];
  ticketMessages: { ticketId: string; author: string }[];
};

/*
 * Topics group the landscape. Each one is recognised by its own words, the
 * same way Hunch recognises context in a question.
 */
const TOPICS: (GraphTopic & { keywords: string[] })[] = [
  {
    id: "vertrek",
    name: "Vakantiegeld & vertrek",
    short: "vakantiegeld bij vertrek",
    c: [-0.62, -0.12],
    keywords: [
      "vakantiegeld",
      "vertrekvakantiegeld",
      "vakantieattest",
      "vakantiedagen",
      "vakantie",
      "bediende",
      "deeltijds",
    ],
  },
  {
    id: "eind",
    name: "Eindafrekening",
    short: "eindafrekening",
    c: [-0.18, -0.6],
    keywords: [
      "eindafrekening",
      "uitdiensttreding",
      "uit dienst",
      "ontslag",
      "checklist",
      "loonhistoriek",
    ],
  },
  {
    id: "loonmotor",
    name: "Loonmotor & rekenregels",
    short: "loonmotor",
    c: [0.42, -0.34],
    keywords: [
      "loonmotor",
      "rekenregel",
      "code",
      "pipeline",
      "devops",
      "deploy",
      "pull request",
      "architectuur",
      "testcas",
      "pr 1842",
    ],
  },
  {
    id: "api",
    name: "API & integraties",
    short: "API-koppeling",
    c: [0.56, 0.36],
    keywords: [
      "api",
      "endpoint",
      "integratie",
      "versiebeheer",
      "breaking",
      "loongegevens",
      "testomgeving",
      "koppel",
    ],
  },
  {
    id: "comms",
    name: "Klantcommunicatie",
    short: "klantcommunicatie",
    c: [-0.32, 0.52],
    keywords: [
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
      "tone of voice",
    ],
  },
];
const OTHER: GraphTopic = {
  id: "overig",
  name: "Overige vragen",
  short: "overige vragen",
  c: [0.08, 0.04],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hits = (text: string, keywords: string[]) =>
  keywords.filter((k) =>
    new RegExp(`(^|[^\\p{L}])${escape(k)}`, "iu").test(text),
  ).length;

export function topicFor(text: string) {
  let best: GraphTopic = OTHER;
  let score = 0;
  for (const t of TOPICS) {
    const n = hits(text, t.keywords);
    if (n > score) [best, score] = [t, n];
  }
  return best.id;
}

const YEAR = 365.25 * 24 * 60 * 60 * 1000;
export function freshness(
  date: string,
  superseded: boolean,
  now: Date,
): Freshness {
  if (superseded) return { k: "old", label: "Vervangen" };
  const age = (now.getTime() - Date.parse(date)) / YEAR;
  if (age < 1) return { k: "ok", label: "Actueel" };
  if (age < 3) return { k: "warn", label: "Nakijken" };
  return { k: "old", label: "Verouderd" };
}

/** Document names as people write them: without extension or case. */
export const normalName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.(txt|pdf|docx?|md)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
const slug = (s: string) =>
  normalName(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** The readable part of a stored document, without its disclaimer header. */
export function excerpt(content: string, max = 260) {
  const text = content
    .replace(/^[A-ZÀ-Ý][A-ZÀ-Ý \-]{6,}\s+—\s+[^.]*\.\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const day = (d: Date) => d.toISOString();

export function buildKnowledgeGraph(
  src: KnowledgeSource,
  now = new Date(),
): KnowledgeGraph {
  /* ---------- organisation ---------- */
  const rootId = "org";
  const deptId = (name: string) => `dept:${slug(name)}`;
  const units: GraphUnit[] = [
    { id: rootId, name: "SD Worx", level: 0, parentId: null, headId: null },
  ];
  for (const name of [...new Set(teams.map((t) => t.department))])
    units.push({
      id: deptId(name),
      name,
      level: 1,
      parentId: rootId,
      headId: null,
    });
  for (const t of teams)
    units.push({
      id: t.id,
      name: t.name,
      level: 2,
      parentId: deptId(t.department),
      headId: t.leadId,
    });
  const leadOf = new Map(teams.map((t) => [t.id, t.leadId]));
  const people: GraphPerson[] = employees.map((e) => {
    const view = personView(e, undefined, now);
    const lead = leadOf.get(e.teamId) ?? null;
    return {
      id: e.id,
      name: e.displayName,
      first: e.displayName.split(" ")[0],
      initials: view.initials,
      tone: view.tone,
      role: e.jobTitle,
      unitId: e.teamId,
      managerId: lead && lead !== e.id ? lead : null,
      isHead: lead === e.id,
      awayUntil: view.awayUntil,
      expertise: expertise
        .filter((x) => x.employeeId === e.id)
        .sort((a, b) => b.weight - a.weight)
        .map(({ signal, weight }) => ({ signal, weight })),
    };
  });
  const byName = new Map(employees.map((e) => [normalName(e.displayName), e]));

  /* ---------- documents: directory + sources stored with tickets ---------- */
  type Draft = Omit<GraphItem, "topic" | "fresh"> & { text: string };
  const drafts: Draft[] = [];
  const docByName = new Map<string, Draft>();
  for (const d of documents) {
    const draft: Draft = {
      id: d.id,
      type: "doc",
      title: d.name,
      date: d.updatedAt,
      authorId: d.ownerId,
      authorLabel: null,
      participants: [],
      experts: [],
      source: d.source,
      location: d.location,
      summary: "",
      refs: [],
      fictional: true,
      status: null,
      href: null,
      text: `${d.name} ${d.keywords.join(" ")}`,
    };
    drafts.push(draft);
    docByName.set(normalName(d.name), draft);
  }
  const ticketDocs = new Map<string, string[]>();
  for (const row of [...src.ticketDocuments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )) {
    const key = normalName(row.name);
    let draft = docByName.get(key);
    if (!draft) {
      draft = {
        id: `td-${slug(row.name)}`,
        type: "doc",
        title: row.name.replace(/\.(txt|pdf|docx?|md)$/i, ""),
        date: row.date ?? day(row.createdAt),
        authorId: null,
        authorLabel: "Bron bij een klantvraag",
        participants: [],
        experts: [],
        source:
          row.kind === "Wetgevingsgericht" ? "Regelgeving" : "Bronbestand",
        location: "Klantvragen",
        summary: "",
        refs: [],
        fictional: row.fictional,
        status: null,
        href: null,
        text: row.name,
      };
      drafts.push(draft);
      docByName.set(key, draft);
    }
    if (!draft.summary && row.content) draft.summary = excerpt(row.content);
    draft.text += ` ${row.content.slice(0, 600)}`;
    ticketDocs.set(row.ticketId, [
      ...(ticketDocs.get(row.ticketId) ?? []),
      draft.id,
    ]);
  }
  for (const d of documents)
    for (const old of d.replaces ?? []) {
      const target = docByName.get(normalName(old));
      if (target)
        docByName.get(normalName(d.name))!.refs.push({
          to: target.id,
          rel: "supersedes",
        });
    }

  /* ---------- conversations ---------- */
  for (const c of conversations) {
    const [authorId, ...participants] = c.participantIds;
    // A conversation discusses the documents it shares words with.
    const discussed = documents
      .map((d) => ({
        d,
        shared: c.keywords.filter((k) => d.keywords.includes(k)),
      }))
      .filter((x) => x.shared.length >= 2)
      .sort((a, b) => b.shared.length - a.shared.length)
      .slice(0, 3);
    drafts.push({
      id: c.id,
      type: "chat",
      title: c.title,
      date: c.lastActivity,
      authorId: authorId ?? null,
      authorLabel: null,
      participants,
      experts: [],
      source: c.channel,
      location: c.location,
      summary: c.snippet,
      refs: discussed.map(({ d, shared }) => ({
        to: d.id,
        rel: "discusses" as const,
        reason: `Gedeelde trefwoorden: ${shared.slice(0, 3).join(", ")}`,
      })),
      fictional: true,
      status: null,
      href: null,
      text: `${c.title} ${c.snippet} ${c.keywords.join(" ")}`,
    });
  }

  /* ---------- hunches ---------- */
  const linksOf = new Map<string, ContextLink[]>();
  for (const l of src.hunchLinks)
    linksOf.set(l.hunchId, [...(linksOf.get(l.hunchId) ?? []), l]);
  const known = (id: string | null | undefined): id is string =>
    !!id && !!findEmployee(id);
  for (const h of src.hunches) {
    const author = findEmployee(h.authorId);
    if (!author) continue;
    const links =
      linksOf.get(h.id) ??
      findContext(`${h.title} ${h.workingOn}`, author as Employee);
    const helpers = src.helpCalls
      .filter(
        (c) =>
          c.hunchId === h.id &&
          (c.state === "accepted" || c.state === "notified"),
      )
      .map((c) => c.recipientId);
    const speakers = src.hunchMessages
      .filter((m) => m.hunchId === h.id)
      .map((m) => m.authorId);
    const participants = [...new Set([...helpers, ...speakers])].filter(
      (id): id is string => known(id) && id !== h.authorId,
    );
    const experts = links
      .filter((l) => l.kind === "person" && !participants.includes(l.refId))
      .sort((a, b) => b.relevance - a.relevance)
      .map((l) => l.refId)
      .filter((id) => known(id) && id !== h.authorId);
    drafts.push({
      id: h.id,
      type: "hunch",
      title: h.title,
      date: day(h.updatedAt),
      authorId: h.authorId,
      authorLabel: null,
      participants,
      experts,
      source:
        h.source === "teams"
          ? "Teams"
          : h.source === "outlook"
            ? "Outlook"
            : "Hunch",
      location: h.sourceLabel ?? `HUN-${String(h.number).padStart(4, "0")}`,
      summary: h.workingOn,
      refs: links
        .filter((l) => l.kind !== "person")
        .sort((a, b) => b.relevance - a.relevance)
        .map((l) => ({ to: l.refId, rel: "uses" as const, reason: l.reason })),
      fictional: true,
      status: hunchStatusLabel[h.status] ?? h.status,
      href: `/hunches/${h.id}`,
      text: `${h.title} ${h.workingOn}`,
    });
  }

  /* ---------- customer questions ---------- */
  for (const t of src.tickets) {
    const helpers = src.ticketMessages
      .filter((m) => m.ticketId === t.id)
      .map((m) => byName.get(normalName(m.author))?.id)
      .filter((id): id is string => !!id);
    drafts.push({
      id: `ticket:${t.id}`,
      type: "ticket",
      title: `${t.company} · ${t.subject}`,
      date: day(t.updatedAt),
      authorId: null,
      authorLabel: `${t.customer} · ${t.company}`,
      participants: [...new Set(helpers)],
      experts: [],
      source: "Klantvragen",
      location: `Klantvraag #${t.number}`,
      summary: excerpt(
        t.question.replace(/^(beste|dag|hallo)[^,\n]*,?\s*/i, ""),
        220,
      ),
      refs: [...new Set(ticketDocs.get(t.id) ?? [])].map((to) => ({
        to,
        rel: "uses" as const,
      })),
      fictional: true,
      status: statusLabel[t.status] ?? t.status,
      href: `/tickets/${t.id}`,
      text: `${t.subject} ${t.question}`,
    });
  }

  /* ---------- finish: drop dangling links, add topic and freshness ---------- */
  const ids = new Set(drafts.map((d) => d.id));
  const superseded = new Set(
    drafts.flatMap((d) =>
      d.refs.filter((r) => r.rel === "supersedes").map((r) => r.to),
    ),
  );
  const docTopic = new Map(
    drafts.filter((d) => d.type === "doc").map((d) => [d.id, topicFor(d.text)]),
  );
  const items: GraphItem[] = drafts.map(({ text, ...d }) => {
    const owner = d.authorId ? findEmployee(d.authorId) : undefined;
    const refs = d.refs.filter((r) => ids.has(r.to) && r.to !== d.id);
    // Conversations, hunches and tickets sit with the source they lean on.
    const source =
      d.type === "doc" ? undefined : refs.find((r) => docTopic.has(r.to));
    return {
      ...d,
      refs,
      summary:
        d.summary ||
        `Staat in ${d.source} › ${d.location}.${owner ? ` Eigenaar: ${owner.displayName}.` : ""}`,
      topic: docTopic.get(source?.to ?? d.id) ?? topicFor(text),
      fresh: freshness(d.date, superseded.has(d.id), now),
    };
  });
  const used = new Set(items.map((i) => i.topic));
  return {
    generatedAt: now.toISOString(),
    rootId,
    people,
    units,
    items,
    topics: [...TOPICS, OTHER]
      .filter((t) => used.has(t.id))
      .map(({ id, name, short, c }) => ({ id, name, short, c })),
  };
}
