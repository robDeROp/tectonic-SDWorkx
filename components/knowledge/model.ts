/*
 * Client-side model over the kennisgraaf: lookups, the ego network around
 * one item or person, the topic structure of the landscape and the signals
 * shown in the details panel. Ported from poc/kennisgraaf, typed, and fed
 * by /api/knowledge instead of generated mock data.
 */
import type {
  GraphItem,
  GraphPerson,
  GraphTopic,
  GraphUnit,
  KnowledgeGraph,
  KnowledgeKind,
  KnowledgeRel,
} from "@/lib/types";

/* ---------- visual vocabulary (Hunch category colours) ---------- */
export type NodeKind = KnowledgeKind | "person" | "unit";
export const COL: Record<
  NodeKind,
  { c: string; soft: string; strong: string }
> = {
  doc: { c: "#1F8A87", soft: "#D7F1EC", strong: "#0D5F5C" },
  chat: { c: "#FF7A50", soft: "#FFE4D9", strong: "#B53A14" },
  hunch: { c: "#E9A90F", soft: "#FFF1C9", strong: "#7A4E00" },
  ticket: { c: "#12343B", soft: "#E2E8E7", strong: "#12343B" },
  person: { c: "#C04A88", soft: "#FBE2EF", strong: "#8A2760" },
  unit: { c: "#4F666B", soft: "#F6EBDC", strong: "#12343B" },
};
export const FRESH_COL = { ok: "#2A7A4B", warn: "#E9A90F", old: "#B3261E" };
export const ITEM_TYPES: KnowledgeKind[] = ["doc", "chat", "hunch", "ticket"];
export const GLYPH: Record<NodeKind, string> = {
  doc: "M7 3 H14 L19 8 V20 A1 1 0 0 1 18 21 H7 A1 1 0 0 1 6 20 V4 A1 1 0 0 1 7 3 Z M14 3 V8 H19 M9 13 H16 M9 17 H14",
  chat: "M5 5 H19 A2 2 0 0 1 21 7 V15 A2 2 0 0 1 19 17 H11 L7 20 V17 H5 A2 2 0 0 1 3 15 V7 A2 2 0 0 1 5 5 Z M8 11 H8.01 M12 11 H12.01 M16 11 H16.01",
  hunch:
    "M15 14 C15.2 13 15.7 12.3 16.5 11.5 C17.5 10.6 18 9.3 18 8 A6 6 0 0 0 6 8 C6 9 6.2 10.2 7.5 11.5 C8.2 12.2 8.8 13 9 14 M9 18 H15 M10 22 H14",
  ticket:
    "M5 6 H19 A2 2 0 0 1 21 8 V10 A2 2 0 0 0 21 14 V16 A2 2 0 0 1 19 18 H5 A2 2 0 0 1 3 16 V14 A2 2 0 0 0 3 10 V8 A2 2 0 0 1 5 6 Z M10 10 V14 M14 10 V14",
  person:
    "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 Z M3 20 C3 16 5.5 14 9 14 C12.5 14 15 16 15 20 M16 4.5 A3 3 0 0 1 16 10.5 M18 14.5 C20 15.3 21 17.2 21 20",
  unit: "M9 3 H15 V8 H9 Z M12 8 V12 M5 15 V12 H19 V15 M3 15 H7 V20 H3 Z M10 15 H14 V20 H10 Z M17 15 H21 V20 H17 Z",
};
export const KIND: Record<NodeKind, { label: string; plural: string }> = {
  doc: { label: "Document", plural: "Documents" },
  chat: { label: "Conversation", plural: "Conversations" },
  hunch: { label: "Hunch", plural: "Hunches" },
  ticket: { label: "Customer question", plural: "Customer questions" },
  person: { label: "Person", plural: "People" },
  unit: { label: "Team", plural: "Teams" },
};
export const kindLabel = (it: GraphItem) =>
  it.type === "chat"
    ? it.source === "Teams"
      ? "Teams conversation"
      : it.source === "Outlook"
        ? "Email thread"
        : "DevOps discussion"
    : KIND[it.type].label;
export const AUTH_REL: Record<KnowledgeKind, string> = {
  doc: "written by",
  chat: "started by",
  hunch: "opened by",
  ticket: "asked by",
};
const AUTH_VERB: Record<KnowledgeKind, string> = {
  doc: "wrote",
  chat: "started",
  hunch: "opened",
  ticket: "handled",
};
const JOIN_REL: Record<KnowledgeKind, string> = {
  doc: "contributed",
  chat: "participated",
  hunch: "helped",
  ticket: "contributed",
};
export const OUT_REL: Record<KnowledgeRel, string> = {
  cites: "references",
  supersedes: "supersedes",
  discusses: "discusses",
  uses: "uses",
};
export const IN_REL: Record<KnowledgeRel, string> = {
  cites: "cited by",
  supersedes: "superseded by",
  discusses: "discussed in",
  uses: "used in",
};
export const LEVEL = ["Organisation", "Department", "Team"];

/* ---------- formatting ---------- */
export const fmt = (n: number) => n.toLocaleString("en-GB");
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
export const trunc = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const byDateDesc = (a: { date: string }, b: { date: string }) =>
  b.date.localeCompare(a.date);
export function wrapLines(s: string, max: number, lines: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = trunc(out[lines - 1] + " …", max);
  }
  return out;
}

/* ---------- navigation between the views ---------- */
export type Focus = { kind: "item" | "person"; id: string };
export type Go =
  | { to: "graph"; focus: Focus }
  | { to: "org"; kind: "unit" | "person"; id: string }
  | { to: "map"; id: string }
  | { to: "topic"; id: string }
  | { to: "href"; href: string };

/* ---------- the model ---------- */
export type UnitStats = {
  size: number;
  types: Record<KnowledgeKind, number>;
  topics: Record<string, number>;
};
export type Model = ReturnType<typeof createModel>;

export function createModel(graph: KnowledgeGraph) {
  const itemById = new Map(graph.items.map((i) => [i.id, i]));
  const personById = new Map(graph.people.map((p) => [p.id, p]));
  const unitById = new Map(graph.units.map((u) => [u.id, u]));
  const topicById = new Map(graph.topics.map((t) => [t.id, t]));
  const incoming = new Map<string, { from: string; rel: KnowledgeRel }[]>();
  const authored = new Map<string, string[]>();
  const joined = new Map<string, string[]>();
  const suggested = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) =>
    m.set(k, [...(m.get(k) ?? []), v]);
  for (const it of graph.items) {
    for (const r of it.refs)
      incoming.set(r.to, [
        ...(incoming.get(r.to) ?? []),
        { from: it.id, rel: r.rel },
      ]);
    if (it.authorId) push(authored, it.authorId, it.id);
    it.participants.forEach((p) => push(joined, p, it.id));
    it.experts.forEach((p) => push(suggested, p, it.id));
  }
  const childrenOf = new Map<string, GraphUnit[]>();
  for (const u of graph.units)
    if (u.parentId)
      childrenOf.set(u.parentId, [...(childrenOf.get(u.parentId) ?? []), u]);
  const membersOf = new Map<string, string[]>();
  for (const p of graph.people) push(membersOf, p.unitId, p.id);
  // Team leads first, then by name.
  for (const [k, ids] of membersOf)
    membersOf.set(
      k,
      ids.sort((a, b) => {
        const pa = personById.get(a)!,
          pb = personById.get(b)!;
        return (
          Number(pb.isHead) - Number(pa.isHead) ||
          pa.name.localeCompare(pb.name)
        );
      }),
    );

  const item = (id: string) => itemById.get(id);
  const person = (id: string) => personById.get(id);
  const unit = (id: string) => unitById.get(id);
  const parentOf = (u: GraphUnit) =>
    u.parentId ? (unitById.get(u.parentId) ?? null) : null;
  const unitPath = (u: GraphUnit) => {
    const out: GraphUnit[] = [];
    let a: GraphUnit | null = u;
    while (a) {
      out.unshift(a);
      a = parentOf(a);
    }
    return out;
  };
  const teamLabel = (p: GraphPerson) => {
    const u = unitById.get(p.unitId);
    const par = u && parentOf(u);
    return u ? (par && par.level ? `${u.name} · ${par.name}` : u.name) : "";
  };
  const authorName = (it: GraphItem) =>
    it.authorId
      ? (personById.get(it.authorId)?.name ?? "")
      : (it.authorLabel ?? "");

  /* Per-unit totals, rolled up the tree. */
  const stats = new Map<string, UnitStats>();
  const statsOf = (u: GraphUnit): UnitStats => {
    if (stats.has(u.id)) return stats.get(u.id)!;
    const s: UnitStats = {
      size: (membersOf.get(u.id) ?? []).length,
      types: { doc: 0, chat: 0, hunch: 0, ticket: 0 },
      topics: {},
    };
    for (const pid of membersOf.get(u.id) ?? [])
      for (const id of authored.get(pid) ?? []) {
        const it = itemById.get(id)!;
        s.types[it.type]++;
        s.topics[it.topic] = (s.topics[it.topic] ?? 0) + 1;
      }
    for (const c of childrenOf.get(u.id) ?? []) {
      const cs = statsOf(c);
      s.size += cs.size;
      for (const t of Object.keys(cs.types) as KnowledgeKind[])
        s.types[t] += cs.types[t];
      for (const [k, v] of Object.entries(cs.topics))
        s.topics[k] = (s.topics[k] ?? 0) + v;
    }
    stats.set(u.id, s);
    return s;
  };
  const peopleIn = (u: GraphUnit): GraphPerson[] => [
    ...(membersOf.get(u.id) ?? []).map((id) => personById.get(id)!),
    ...(childrenOf.get(u.id) ?? []).flatMap(peopleIn),
  ];
  const personTopics = (p: GraphPerson, n = 3) => {
    const c: Record<string, number> = {};
    for (const id of [
      ...(authored.get(p.id) ?? []),
      ...(joined.get(p.id) ?? []),
    ]) {
      const t = itemById.get(id)!.topic;
      c[t] = (c[t] ?? 0) + 1;
    }
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .flatMap(([id, k]) => {
        const t = topicById.get(id);
        return t ? [{ t, k }] : [];
      });
  };

  return {
    graph,
    items: graph.items,
    people: graph.people,
    units: graph.units,
    topics: graph.topics,
    root: unitById.get(graph.rootId)!,
    item,
    person,
    unit,
    topic: (id: string) => topicById.get(id),
    incoming: (id: string) => incoming.get(id) ?? [],
    authored: (id: string) => authored.get(id) ?? [],
    joined: (id: string) => joined.get(id) ?? [],
    suggested: (id: string) => suggested.get(id) ?? [],
    childrenOf: (id: string) => childrenOf.get(id) ?? [],
    membersOf: (id: string) => membersOf.get(id) ?? [],
    parentOf,
    unitPath,
    teamLabel,
    authorName,
    statsOf,
    peopleIn,
    personTopics,
  };
}

/* ---------- ego network ---------- */
export type EgoNode = {
  key: string;
  kind: NodeKind;
  group: NodeKind;
  id: string;
  label: string;
  rel: string;
  sub: string;
  initials?: string;
  x?: number;
  y?: number;
};
export type Ego = {
  center: EgoNode;
  ring: EgoNode[];
  over: Partial<Record<NodeKind, number>>;
};
const CAPS: Record<NodeKind, number> = {
  person: 7,
  unit: 2,
  doc: 6,
  chat: 5,
  hunch: 6,
  ticket: 5,
};
export const GROUP_ORDER: NodeKind[] = [
  "person",
  "unit",
  "doc",
  "chat",
  "hunch",
  "ticket",
];
export const GROUP_LABEL: Record<NodeKind, string> = {
  person: "People",
  unit: "Teams",
  doc: "Documents",
  chat: "Conversations",
  hunch: "Hunches",
  ticket: "Customer questions",
};

const nItem = (it: GraphItem, rel: string): EgoNode => ({
  key: "item:" + it.id,
  kind: it.type,
  group: it.type,
  id: it.id,
  label: it.title,
  rel,
  sub: fmtDate(it.date),
});
const nPerson = (p: GraphPerson, rel: string): EgoNode => ({
  key: "person:" + p.id,
  kind: "person",
  group: "person",
  id: p.id,
  label: p.name,
  rel,
  sub: p.role,
  initials: p.initials,
});
function egoBuilder(center: EgoNode) {
  const seen = new Set([center.key]);
  const ring: EgoNode[] = [];
  const over: Ego["over"] = {};
  const cnt: Partial<Record<NodeKind, number>> = {};
  return {
    ego: { center, ring, over } as Ego,
    add(n: EgoNode | null | undefined) {
      if (!n || seen.has(n.key)) return;
      seen.add(n.key);
      cnt[n.group] = (cnt[n.group] ?? 0) + 1;
      if (cnt[n.group]! > CAPS[n.group])
        over[n.group] = (over[n.group] ?? 0) + 1;
      else ring.push(n);
    },
  };
}

export function egoOf(m: Model, f: Focus): Ego | null {
  if (f.kind === "person") {
    const p = m.person(f.id);
    return p ? egoPerson(m, p) : null;
  }
  const it = m.item(f.id);
  return it ? egoItem(m, it) : null;
}
function nUnit(m: Model, u: GraphUnit, rel: string): EgoNode {
  return {
    key: "unit:" + u.id,
    kind: "unit",
    group: "unit",
    id: u.id,
    label: u.name,
    rel,
    sub: m.parentOf(u)?.name ?? "",
  };
}
function egoItem(m: Model, it: GraphItem): Ego {
  const E = egoBuilder({
    ...nItem(it, kindLabel(it)),
    sub: it.authorLabel ?? "",
  });
  const a = it.authorId ? m.person(it.authorId) : undefined;
  if (a) E.add(nPerson(a, AUTH_REL[it.type]));
  it.participants.forEach((pid) => {
    const p = m.person(pid);
    if (p) E.add(nPerson(p, JOIN_REL[it.type]));
  });
  it.experts.forEach((pid) => {
    const p = m.person(pid);
    if (p) E.add(nPerson(p, "suggested expert"));
  });
  const u = a && m.unit(a.unitId);
  if (u) E.add(nUnit(m, u, "owner"));
  it.refs.forEach((r) => {
    const x = m.item(r.to);
    if (x) E.add(nItem(x, OUT_REL[r.rel]));
  });
  m.incoming(it.id)
    .map((r) => ({ r, x: m.item(r.from)! }))
    .sort((p, q) => byDateDesc(p.x, q.x))
    .forEach(({ r, x }) => E.add(nItem(x, IN_REL[r.rel])));
  return E.ego;
}
function egoPerson(m: Model, p: GraphPerson): Ego {
  const E = egoBuilder(nPerson(p, p.role));
  const boss = p.managerId ? m.person(p.managerId) : undefined;
  if (boss) E.add(nPerson(boss, "manager"));
  const u = m.unit(p.unitId);
  if (u) E.add(nUnit(m, u, p.isHead ? "leads" : "member of"));
  const co = new Map<string, number>();
  for (const id of [...m.authored(p.id), ...m.joined(p.id)]) {
    const it = m.item(id)!;
    for (const q of [it.authorId, ...it.participants])
      if (q && q !== p.id) co.set(q, (co.get(q) ?? 0) + 1);
  }
  [...co.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([q, k]) => {
      const x = m.person(q);
      if (x)
        E.add(nPerson(x, `${k} ${k === 1 ? "shared item" : "shared items"}`));
    });
  if (p.isHead)
    m.membersOf(p.unitId)
      .filter((id) => id !== p.id)
      .slice(0, 4)
      .forEach((id) => E.add(nPerson(m.person(id)!, "reports to")));
  m.authored(p.id)
    .map((id) => m.item(id)!)
    .sort(byDateDesc)
    .forEach((it) => E.add(nItem(it, AUTH_VERB[it.type])));
  m.joined(p.id)
    .map((id) => m.item(id)!)
    .sort(byDateDesc)
    .forEach((it) => E.add(nItem(it, JOIN_REL[it.type])));
  m.suggested(p.id)
    .map((id) => m.item(id)!)
    .sort(byDateDesc)
    .forEach((it) => E.add(nItem(it, "suggested as an expert")));
  return E.ego;
}
const isItemKind = (k: NodeKind): k is KnowledgeKind =>
  ITEM_TYPES.includes(k as KnowledgeKind);
/** Whether two ring nodes are also connected to each other (the dashed lines). */
export function linked(m: Model, a: EgoNode, b: EgoNode): boolean {
  if (a.kind === "person" && isItemKind(b.kind)) {
    const it = m.item(b.id)!;
    return (
      it.authorId === a.id ||
      it.participants.includes(a.id) ||
      it.experts.includes(a.id)
    );
  }
  if (b.kind === "person" && isItemKind(a.kind)) return linked(m, b, a);
  if (isItemKind(a.kind) && isItemKind(b.kind)) {
    const x = m.item(a.id)!,
      y = m.item(b.id)!;
    return (
      x.refs.some((r) => r.to === y.id) || y.refs.some((r) => r.to === x.id)
    );
  }
  if (a.kind === "person" && b.kind === "unit")
    return m.person(a.id)!.unitId === b.id;
  if (b.kind === "person" && a.kind === "unit") return linked(m, b, a);
  if (a.kind === "person" && b.kind === "person") {
    const x = m.person(a.id)!,
      y = m.person(b.id)!;
    return x.managerId === y.id || y.managerId === x.id;
  }
  return false;
}
export const egoTotal = (E: Ego) =>
  E.ring.length + Object.values(E.over).reduce((a, b) => a + (b ?? 0), 0);

/* ---------- signals in the details panel ---------- */
export type Signal = { tone: "ok" | "warn" | "danger"; text: string; go?: Go };
const YEAR = 365.25 * 864e5;
export const ageOf = (it: GraphItem) =>
  (Date.now() - Date.parse(it.date)) / YEAR;
export function signalsFor(m: Model, it: GraphItem): Signal[] {
  const s: Signal[] = [];
  const inc = m.incoming(it.id);
  const sup = inc.find((r) => r.rel === "supersedes");
  if (sup) {
    const n = m.item(sup.from)!;
    s.push({
      tone: "danger",
      text: `Superseded by “${n.title}”. Do not use this as a source anymore.`,
      go: { to: "graph", focus: { kind: "item", id: n.id } },
    });
  }
  it.refs
    .filter((r) => r.rel === "supersedes")
    .forEach((r) => {
      const old = m.item(r.to);
      if (!old) return;
      const late = m
        .incoming(old.id)
        .filter((x) => x.rel === "uses")
        .map((x) => m.item(x.from)!)
        .filter((t) => t.date >= it.date);
      if (late.length)
        s.push({
          tone: "warn",
          text: `${late.length} ${late.length === 1 ? "item still used" : "items still used"} the superseded source after publication: “${old.title}”.`,
          go: { to: "graph", focus: { kind: "item", id: late[0].id } },
        });
    });
  if (!sup && it.type === "doc" && ageOf(it) > 3)
    s.push({
      tone: "warn",
      text: "More than three years old. Ask the owner to review it.",
    });
  const used = inc.filter((r) => r.rel === "uses").length;
  if (used)
    s.push({
      tone: "ok",
      text: `Used as a source in ${used} ${used === 1 ? "hunch or customer question" : "hunches and customer questions"}.`,
    });
  return s;
}

/* ---------- the landscape: topics → source documents → what uses them ---------- */
export type RingNode =
  | {
      key: string;
      kind: "star";
      doc: GraphItem;
      orbit: GraphItem[];
      score: number;
    }
  | { key: string; kind: "rest"; docs: GraphItem[]; orbit: GraphItem[] }
  | { key: string; kind: "gap"; orbit: GraphItem[] };
export type TopicStruct = {
  t: GraphTopic;
  list: GraphItem[];
  docs: GraphItem[];
  orbit: Map<string, GraphItem[]>;
  stars: GraphItem[];
  rest: GraphItem[];
  unused: number;
  gaps: GraphItem[];
  risk: GraphItem[];
  authors: { p: GraphPerson; k: number }[];
  expert: { p: GraphPerson; k: number; share: number } | null;
  fresh: { ok: number; warn: number; old: number };
  ring: RingNode[];
  share: number;
  score: Map<string, number>;
};
const N_STARS = 8;
export function primaryDoc(m: Model, it: GraphItem) {
  if (it.type === "doc") return null;
  const docs = it.refs
    .map((r) => m.item(r.to))
    .filter((x) => x?.type === "doc") as GraphItem[];
  return (docs.find((d) => d.topic === it.topic) ?? docs[0])?.id ?? null;
}
export function structures(m: Model) {
  const out = new Map<string, TopicStruct>();
  for (const t of m.topics) {
    const list = m.items.filter((i) => i.topic === t.id);
    const docs = list.filter((i) => i.type === "doc");
    const orbit = new Map(docs.map((d) => [d.id, [] as GraphItem[]]));
    const gaps: GraphItem[] = [];
    // Every hunch, question and conversation sits around each source it uses.
    for (const it of list) {
      if (it.type === "doc") continue;
      const used = it.refs.filter((r) => orbit.has(r.to));
      if (!used.length) gaps.push(it);
      used.forEach((r) => orbit.get(r.to)!.push(it));
    }
    const score = new Map(
      docs.map((d) => [
        d.id,
        orbit.get(d.id)!.length +
          m.incoming(d.id).filter((r) => r.rel === "cites").length * 2,
      ]),
    );
    docs.forEach((d) => orbit.get(d.id)!.sort(byDateDesc));
    const ranked = [...docs].sort(
      (a, b) => score.get(b.id)! - score.get(a.id)!,
    );
    const stars = ranked.filter((d) => score.get(d.id)! > 0).slice(0, N_STARS);
    const rest = ranked.filter((d) => !stars.includes(d));
    const unused = docs.filter((d) => m.incoming(d.id).length === 0).length;
    const risk = docs.filter(
      (d) => d.fresh.k === "old" && orbit.get(d.id)!.some((i) => ageOf(i) < 1),
    );
    const byAuthor = new Map<string, number>();
    docs.forEach(
      (d) =>
        d.authorId &&
        byAuthor.set(d.authorId, (byAuthor.get(d.authorId) ?? 0) + 1),
    );
    const authors = [...byAuthor.entries()]
      .sort((a, b) => b[1] - a[1])
      .flatMap(([id, k]) => {
        const p = m.person(id);
        return p ? [{ p, k }] : [];
      });
    const fresh = { ok: 0, warn: 0, old: 0 };
    list.forEach((i) => fresh[i.fresh.k]++);
    const ring: RingNode[] = [
      ...stars.map((d) => ({
        key: "star:" + d.id,
        kind: "star" as const,
        doc: d,
        orbit: orbit.get(d.id)!,
        score: score.get(d.id)!,
      })),
      ...(rest.length
        ? [
            {
              key: "rest:" + t.id,
              kind: "rest" as const,
              docs: rest,
              orbit: [],
            },
          ]
        : []),
      ...(gaps.length
        ? [
            {
              key: "gap:" + t.id,
              kind: "gap" as const,
              orbit: gaps.sort(byDateDesc),
            },
          ]
        : []),
    ];
    const nonDocs = list.length - docs.length;
    const starIds = new Set(stars.map((d) => d.id));
    const share =
      list.filter(
        (i) => i.type !== "doc" && i.refs.some((r) => starIds.has(r.to)),
      ).length / Math.max(1, nonDocs);
    out.set(t.id, {
      t,
      list,
      docs,
      orbit,
      stars,
      rest,
      unused,
      gaps,
      risk,
      authors,
      expert:
        authors[0] && docs.length
          ? { ...authors[0], share: authors[0].k / docs.length }
          : null,
      fresh,
      ring,
      share,
      score,
    });
  }
  return out;
}
