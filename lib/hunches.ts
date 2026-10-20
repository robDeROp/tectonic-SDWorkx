/*
 * Pure Hunch logic: which people, documents and conversations belong to a
 * hunch, who is available, and who a call for help goes to next. No database
 * access, so it is easy to test and can run live in the create form.
 */
import {
  conversations,
  documents,
  employees,
  expertise,
  findConversation,
  findDocument,
  findEmployee,
  findTeam,
  type Employee,
} from "./directory";
import type { ContextLink, HunchContextView, PersonView } from "./types";
import { matchesKeyword } from "./keywords";

/** How often a call for help may be passed on before it stops. */
export const MAX_PASSES = 2;

/** How many items of each kind a hunch keeps. */
const LIMIT = { person: 5, document: 4, conversation: 4 } as const;

export function awayUntil(employee: Employee, now = new Date()) {
  const ooo = employee.outOfOffice;
  if (!ooo) return null;
  const t = now.getTime();
  return t >= Date.parse(ooo.start) && t < Date.parse(ooo.end) ? ooo.end : null;
}

export function personView(
  employee: Employee,
  extra?: { relevance: number; signal: string },
  now = new Date(),
): PersonView {
  return {
    id: employee.id,
    name: employee.displayName,
    initials: employee.displayName
      .split(" ")
      .filter((p) => p[0] === p[0].toUpperCase())
      .map((p) => p[0])
      .slice(0, 2)
      .join(""),
    // Directory order spreads the five avatar colours evenly over people.
    tone:
      Math.max(
        0,
        employees.findIndex((e) => e.id === employee.id),
      ) % 5,
    jobTitle: employee.jobTitle,
    team: findTeam(employee.teamId)?.name ?? "",
    awayUntil: awayUntil(employee, now),
    ...extra,
  };
}

/** Someone outside the directory, such as a customer who mailed in. */
export function outsiderView(name: string, detail: string | null): PersonView {
  return {
    id: `outside:${name}`,
    name,
    initials: name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    tone: 5,
    jobTitle: detail ?? "",
    team: "",
    awayUntil: null,
  };
}

/** Keywords found in the text, matched at the start of a word. */
function hitsIn(text: string, keywords: string[]) {
  return [...new Set(keywords)].filter((k) => matchesKeyword(text, k));
}
const recognised = (hits: string[]) =>
  `Matched: ${hits.slice(0, 3).join(", ")}`;
const top = <T extends { relevance: number }>(items: T[], n: number) =>
  items.sort((a, b) => b.relevance - a.relevance).slice(0, n);

/**
 * Finds what is relevant to a hunch: people by their expertise signals,
 * documents and conversations by their own words. When no expert matches,
 * the author's team from Entra is the fallback. `exclude` holds
 * "kind:id" keys the author removed before opening the hunch.
 */
export function findContext(
  text: string,
  author: Employee,
  exclude: Iterable<string> = [],
): ContextLink[] {
  const skip = new Set(exclude);
  const allowed = (kind: ContextLink["kind"], refId: string) =>
    !skip.has(`${kind}:${refId}`);

  const people = new Map<string, ContextLink>();
  for (const e of expertise) {
    if (e.employeeId === author.id || !allowed("person", e.employeeId))
      continue;
    const hits = hitsIn(text, e.keywords);
    if (!hits.length) continue;
    const relevance = Math.round(
      e.weight * Math.min(1, 0.7 + 0.1 * hits.length),
    );
    if ((people.get(e.employeeId)?.relevance ?? 0) < relevance)
      people.set(e.employeeId, {
        kind: "person",
        refId: e.employeeId,
        relevance,
        reason: e.signal,
      });
  }
  if (!people.size)
    for (const e of employees)
      if (
        e.teamId === author.teamId &&
        e.id !== author.id &&
        allowed("person", e.id)
      )
        people.set(e.id, {
          kind: "person",
          refId: e.id,
          relevance: 40,
          reason: "Works in your team according to Entra",
        });

  const items = <T extends { id: string; keywords: string[] }>(
    kind: "document" | "conversation",
    list: T[],
  ) =>
    list.flatMap((item): ContextLink[] => {
      const hits = hitsIn(text, item.keywords);
      return hits.length && allowed(kind, item.id)
        ? [
            {
              kind,
              refId: item.id,
              relevance: Math.min(96, 40 + 14 * hits.length),
              reason: recognised(hits),
            },
          ]
        : [];
    });

  return [
    ...top([...people.values()], LIMIT.person),
    ...top(items("document", documents), LIMIT.document),
    ...top(items("conversation", conversations), LIMIT.conversation),
  ];
}

/** Resolves stored links into what the hunch page shows, most relevant first. */
export function contextView(
  links: ContextLink[],
  now = new Date(),
): HunchContextView {
  const sorted = [...links].sort((a, b) => b.relevance - a.relevance);
  const person = (id: string) => {
    const e = findEmployee(id);
    return e ? personView(e, undefined, now) : null;
  };
  return {
    people: sorted.flatMap((l) => {
      const e = l.kind === "person" ? findEmployee(l.refId) : undefined;
      return e
        ? [personView(e, { relevance: l.relevance, signal: l.reason }, now)]
        : [];
    }),
    documents: sorted.flatMap((l) => {
      const d = l.kind === "document" ? findDocument(l.refId) : undefined;
      if (!d) return [];
      const { keywords: _, ownerId, ...rest } = d;
      return [
        {
          ...rest,
          owner: person(ownerId)?.name ?? "",
          relevance: l.relevance,
          reason: l.reason,
        },
      ];
    }),
    conversations: sorted.flatMap((l) => {
      const c =
        l.kind === "conversation" ? findConversation(l.refId) : undefined;
      if (!c) return [];
      const { keywords: _, participantIds, ...rest } = c;
      return [
        {
          ...rest,
          participants: participantIds.flatMap((id) => {
            const p = person(id);
            return p ? [p] : [];
          }),
          relevance: l.relevance,
          reason: l.reason,
        },
      ];
    }),
  };
}

export type RouteResult = {
  skipped: { employee: Employee; until: string }[];
  recipient: Employee | null;
};

/**
 * Walks the hunch's people from most to least relevant and returns the first
 * one who is available. Out-of-office people are skipped (and reported), the
 * author and anyone in `exclude` are left out.
 */
export function routeCall({
  people,
  authorId,
  exclude,
  now = new Date(),
}: {
  people: { id: string; relevance?: number }[];
  authorId: string;
  exclude: Iterable<string>;
  now?: Date;
}): RouteResult {
  const excluded = new Set([authorId, ...exclude]);
  const queue = [...people]
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .filter((p) => !excluded.has(p.id));
  const skipped: RouteResult["skipped"] = [];
  for (const { id } of queue) {
    const employee = findEmployee(id);
    if (!employee) continue;
    const until = awayUntil(employee, now);
    if (!until) return { skipped, recipient: employee };
    skipped.push({ employee, until });
  }
  return { skipped, recipient: null };
}
