"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { GraphItem, GraphTopic } from "@/lib/types";
import {
  COL,
  FRESH_COL,
  GLYPH,
  KIND,
  byDateDesc,
  fmt,
  fmtDate,
  kindLabel,
  primaryDoc,
  structures,
  trunc,
  wrapLines,
  type Focus,
  type Go,
  type Model,
  type RingNode,
  type TopicStruct,
} from "./model";
import { Dot, Glyph, Mini, ZoomControls } from "./bits";
import { ItemDetails, SignalList } from "./details";
import { KnowledgeDetailsModal, hrefFor } from "./details-modal";
import { ErrorNotice, Spinner } from "../ui";
import { useKnowledge } from "./use-knowledge";

/* ---------- lenses: look at the map from one question ---------- */
type LensId = "health" | "gaps" | "risk" | "expert";
const LENSES: {
  id: LensId;
  label: string;
  col: string;
  on: string;
  help: string;
}[] = [
  {
    id: "health",
    label: "Overzicht",
    col: "#12343B",
    on: "#FFF3E4",
    help: "De gekleurde ring rond elk onderwerp toont hoe actueel de kennis is: groen is actueel, geel moet nagekeken worden, rood is verouderd of vervangen.",
  },
  {
    id: "gaps",
    label: "Waar ontbreekt kennis?",
    col: "#FF7A50",
    on: "#12343B",
    help: "Hunches, klantvragen en gesprekken die naar geen enkel document verwijzen. Daar ontbreekt een bron, of is ze niet vindbaar.",
  },
  {
    id: "risk",
    label: "Verouderd maar gebruikt",
    col: "#B3261E",
    on: "#FFFFFF",
    help: "Verouderde of vervangen documenten die het afgelopen jaar nog als bron gebruikt zijn.",
  },
  {
    id: "expert",
    label: "Hangt af van één persoon",
    col: "#C04A88",
    on: "#FFFFFF",
    help: "Onderwerpen waar één persoon het grootste deel van de documenten beheert. Valt die persoon weg, dan verdwijnt de kennis mee.",
  },
];
const lensById = new Map(LENSES.map((l) => [l.id, l]));
function lensMetric(s: TopicStruct, lens: LensId) {
  const nonDocs = Math.max(1, s.list.length - s.docs.length);
  if (lens === "gaps") {
    const v = s.gaps.length / nonDocs;
    return {
      v,
      on: s.gaps.length > 0,
      text: `${s.gaps.length} zonder bron · ${Math.round(v * 100)}%`,
    };
  }
  if (lens === "risk")
    return {
      v: s.risk.length,
      on: s.risk.length > 0,
      text: `${s.risk.length} ${s.risk.length === 1 ? "risicobron" : "risicobronnen"}`,
    };
  if (lens === "expert") {
    const e = s.expert;
    return {
      v: e?.share ?? 0,
      on: !!e && e.share >= 0.5 && s.docs.length >= 2,
      text: e ? `${Math.round(e.share * 100)}% door ${e.p.first}` : "",
    };
  }
  return { v: s.list.length, on: true, text: "" };
}
function nodeMatchesLens(n: RingNode, s: TopicStruct, lens: LensId) {
  if (lens === "health") return true;
  if (lens === "gaps") return n.kind === "gap";
  if (lens === "risk")
    return n.kind === "star"
      ? s.risk.includes(n.doc)
      : n.kind === "rest"
        ? n.docs.some((d) => s.risk.includes(d))
        : false;
  if (lens === "expert")
    return n.kind === "star"
      ? n.doc.authorId === s.expert?.p.id
      : n.kind === "rest";
  return true;
}

/* ---------- scene ---------- */
const S = 520,
  PILL_W = 228,
  PILL_H = 42,
  PILL_GAP = 8;
type Sel =
  | { kind: "item"; id: string }
  | { kind: "ring"; key: string }
  | {
      kind: "stack";
      key: string;
      items: GraphItem[];
      type: GraphItem["type"];
      owner: string;
    }
  | { kind: "topic"; id: string }
  | null;
type KNode = {
  key: string;
  kind: "island" | "hub" | "star" | "rest" | "gap" | "pill" | "stack";
  x: number;
  y: number;
  r: number;
  w?: number;
  h?: number;
  t?: GraphTopic;
  ring?: RingNode;
  it?: GraphItem;
  items?: GraphItem[];
  type?: GraphItem["type"];
  owner?: string;
  parent?: string;
  ang?: number;
  s?: TopicStruct;
};
type KLink = {
  key: string;
  kind: "spoke" | "sat" | "cites" | "supersedes" | "also";
  a: KNode;
  b: KNode;
  hub?: KNode;
  dir?: number;
};
type View = {
  focus: string | null;
  open: string | null;
  pinned: string | null;
  lens: LensId;
};

function satellitesOf(n: RingNode, pinned: string | null) {
  const out: {
    key: string;
    kind: "pill" | "stack";
    it?: GraphItem;
    items?: GraphItem[];
    type?: GraphItem["type"];
    owner?: string;
  }[] = [];
  const pin = (arr: GraphItem[]) => {
    const i = arr.findIndex((x) => x.id === pinned);
    if (i > 0) arr.unshift(arr.splice(i, 1)[0]);
    return arr;
  };
  const add = (list: GraphItem[], type: GraphItem["type"], capN: number) => {
    const arr = pin([...list]);
    arr
      .slice(0, capN)
      .forEach((it) => out.push({ key: "sat:" + it.id, kind: "pill", it }));
    if (arr.length > capN)
      out.push({
        key: `stack:${n.key}:${type}`,
        kind: "stack",
        type,
        items: arr.slice(capN),
        owner: n.key,
      });
  };
  if (n.kind === "rest") add(n.docs, "doc", 6);
  else
    (["chat", "hunch", "ticket"] as const).forEach((type) => {
      const arr = n.orbit.filter((i) => i.type === type);
      if (arr.length) add(arr, type, type === "chat" ? 2 : 3);
    });
  return out;
}
function scene(
  topics: GraphTopic[],
  structs: Map<string, TopicStruct>,
  v: View,
) {
  const nodes: KNode[] = [];
  const links: KLink[] = [];
  if (!v.focus) {
    for (const t of topics) {
      const s = structs.get(t.id)!;
      nodes.push({
        key: "topic:" + t.id,
        kind: "island",
        t,
        s,
        x: t.c[0] * S,
        y: t.c[1] * S,
        r: 52 + Math.sqrt(s.list.length) * 6,
      });
    }
    return { nodes, links, open: undefined as KNode | undefined };
  }
  const t = topics.find((x) => x.id === v.focus)!;
  const s = structs.get(t.id)!;
  const cx = t.c[0] * S,
    cy = t.c[1] * S;
  const hub: KNode = {
    key: "topic:" + t.id,
    kind: "hub",
    t,
    s,
    x: cx,
    y: cy,
    r: 62,
  };
  nodes.push(hub);
  const wts = s.ring.map((n) => (n.key === v.open ? 3.4 : 1));
  const W = d3.sum(wts);
  const RR = Math.max(250, (W * 182) / (2 * Math.PI));
  let a = -Math.PI / 2 - (wts[0] / W) * Math.PI;
  const byDoc = new Map<string, KNode>();
  s.ring.forEach((rn, i) => {
    const span = (wts[i] / W) * 2 * Math.PI;
    const ang = a + span / 2;
    a += span;
    const n: KNode = {
      key: rn.key,
      kind: rn.kind,
      ring: rn,
      x: cx + Math.cos(ang) * RR,
      y: cy + Math.sin(ang) * RR,
      ang,
      r: rn.kind === "star" ? Math.min(36, 17 + Math.sqrt(rn.score) * 4) : 28,
      parent: hub.key,
      s,
    };
    nodes.push(n);
    links.push({ key: "l:" + n.key, kind: "spoke", a: hub, b: n });
    if (rn.kind === "star") byDoc.set(rn.doc.id, n);
  });
  for (const n of byDoc.values())
    if (n.ring?.kind === "star")
      n.ring.doc.refs.forEach((r) => {
        const m = byDoc.get(r.to);
        if (m)
          links.push({
            key: "x:" + n.key + ">" + m.key,
            kind: r.rel === "supersedes" ? "supersedes" : "cites",
            a: n,
            b: m,
            hub,
          });
      });
  const open = nodes.find((n) => n.key === v.open);
  if (open?.ring) {
    const sats = satellitesOf(open.ring, v.pinned);
    const dir = Math.cos(open.ang!) >= -0.2 ? 1 : -1;
    const colH = sats.length * (PILL_H + PILL_GAP) - PILL_GAP;
    const ccx = open.x + dir * (open.r + 78 + PILL_W / 2);
    const ccy = open.y + Math.sin(open.ang!) * Math.min(170, colH / 2 + 20);
    sats.forEach((sv, i) => {
      const n: KNode = {
        ...sv,
        x: ccx,
        y: ccy - colH / 2 + PILL_H / 2 + i * (PILL_H + PILL_GAP),
        w: PILL_W,
        h: PILL_H,
        r: 0,
        parent: open.key,
      };
      nodes.push(n);
      links.push({ key: "l:" + n.key, kind: "sat", a: open, b: n, dir });
      if (n.kind === "pill")
        n.it!.refs.forEach((r) => {
          const m = byDoc.get(r.to);
          if (m && m !== open)
            links.push({
              key: "y:" + n.key + ">" + m.key,
              kind: "also",
              a: n,
              b: m,
              hub,
            });
        });
    });
  }
  return { nodes, links, open };
}
function kPath(l: KLink) {
  const { a, b } = l;
  if (l.kind === "sat") {
    const x0 = a.x + l.dir! * a.r,
      x1 = b.x - (l.dir! * b.w!) / 2,
      m = (x0 + x1) / 2;
    return `M${x0},${a.y} C${m},${a.y} ${m},${b.y} ${x1},${b.y}`;
  }
  if (l.kind === "spoke") return `M${a.x},${a.y} L${b.x},${b.y}`;
  const h = l.hub!,
    mx = (a.x + b.x) / 2,
    my = (a.y + b.y) / 2;
  return `M${a.x},${a.y} Q${mx + (h.x - mx) * 0.45},${my + (h.y - my) * 0.45} ${b.x},${b.y}`;
}

type G = d3.Selection<SVGGElement, unknown, null, undefined>;
const svgGlyph = (
  g: G,
  kind: keyof typeof GLYPH,
  size: number,
  color: string,
) =>
  g
    .append("path")
    .attr("d", GLYPH[kind])
    .attr(
      "transform",
      `translate(${-size / 2},${-size / 2}) scale(${size / 24})`,
    )
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round");
function lensPill(g: G, lens: LensId, text: string, y: number) {
  const L = lensById.get(lens)!,
    w = text.length * 6.4 + 18;
  const p = g.append("g").attr("transform", `translate(0,${y})`);
  p.append("rect")
    .attr("x", -w / 2)
    .attr("y", -11)
    .attr("width", w)
    .attr("height", 22)
    .attr("rx", 11)
    .attr("fill", L.col);
  p.append("text")
    .attr("class", "kg-kbadge")
    .attr("text-anchor", "middle")
    .attr("dy", "0.36em")
    .attr("fill", L.on)
    .text(text);
}
function healthRing(g: G, s: TopicStruct, r: number) {
  const data = (["ok", "warn", "old"] as const).map((k) => ({
    k,
    v: s.fresh[k],
  }));
  const arc = d3
    .arc<d3.PieArcDatum<{ k: "ok" | "warn" | "old"; v: number }>>()
    .innerRadius(r - 6)
    .outerRadius(r)
    .padAngle(0.025);
  g.selectAll(null)
    .data(
      d3
        .pie<{ k: "ok" | "warn" | "old"; v: number }>()
        .sort(null)
        .value((d) => d.v)(data),
    )
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => FRESH_COL[d.data.k]);
}
function captionLines(g: G, lines: string[], y0: number) {
  lines.forEach((l, i) =>
    g
      .append("text")
      .attr("class", "kg-cap")
      .attr("text-anchor", "middle")
      .attr("y", y0 + i * 16)
      .text(l),
  );
  return y0 + lines.length * 16;
}
function drawK(g: G, n: KNode, v: View) {
  g.selectAll("*").remove();
  if (n.kind === "island" || n.kind === "hub") {
    const s = n.s!,
      r = n.r;
    g.append("circle").attr("class", "kg-kbody").attr("r", r);
    healthRing(g, s, r);
    const lines = wrapLines(n.t!.name, 12, 2),
      longest = d3.max(lines, (l) => l.length) ?? 1;
    const fs = Math.min(
        n.kind === "hub" ? 17 : 15,
        (2 * r * 0.8) / (longest * 0.58),
      ),
      lh = fs * 1.15;
    const y0 = (n.kind === "hub" ? -12 : -6) - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) =>
      g
        .append("text")
        .attr("class", "kg-klbl")
        .attr("text-anchor", "middle")
        .attr("y", y0 + i * lh)
        .style("font-size", fs.toFixed(1) + "px")
        .text(l),
    );
    g.append("text")
      .attr("class", "kg-kcnt")
      .attr("text-anchor", "middle")
      .attr("y", y0 + (lines.length - 1) * lh + 17)
      .text(`${fmt(s.list.length)} items`);
    if (n.kind === "hub")
      g.append("text")
        .attr("class", "kg-kcnt")
        .attr("text-anchor", "middle")
        .attr("y", y0 + (lines.length - 1) * lh + 32)
        .text(`${s.stars.length} kernbronnen`);
    const m = lensMetric(s, v.lens);
    if (v.lens !== "health" && m.on) lensPill(g, v.lens, m.text, -r - 2);
    g.append("title").text(
      `${n.t!.name} · ${fmt(s.list.length)} items · klik om te openen`,
    );
    return;
  }
  if (n.kind === "star" || n.kind === "rest" || n.kind === "gap") {
    const rn = n.ring!,
      s = n.s!,
      r = n.r,
      open = v.open === n.key;
    if (rn.kind === "star") {
      g.append("circle")
        .attr("r", r + 4)
        .attr("fill", "none")
        .attr("stroke", FRESH_COL[rn.doc.fresh.k])
        .attr("stroke-width", 3);
      g.append("circle")
        .attr("class", "kg-kbody")
        .attr("r", r)
        .attr("fill", COL.doc.soft)
        .attr("stroke", COL.doc.c);
      svgGlyph(g, "doc", Math.max(18, r * 0.95), COL.doc.strong);
    } else {
      const gap = rn.kind === "gap";
      g.append("circle")
        .attr("class", "kg-kbody")
        .attr("r", r)
        .attr("fill", gap ? COL.chat.soft : "#F6EBDC")
        .attr("stroke", gap ? COL.chat.c : "#4F666B")
        .attr("stroke-dasharray", "4 4");
      if (gap)
        g.append("text")
          .attr("class", "kg-klbl")
          .attr("text-anchor", "middle")
          .attr("dy", "0.36em")
          .attr("fill", COL.chat.strong)
          .style("font-size", "22px")
          .text("?");
      else svgGlyph(g, "doc", 22, "#4F666B");
    }
    const title =
      rn.kind === "star"
        ? rn.doc.title
        : rn.kind === "rest"
          ? "Overige documenten"
          : "Zonder bron";
    const y = captionLines(g, wrapLines(title, 22, 2), r + 20);
    let sub: string;
    if (rn.kind === "star") {
      const c = { hunch: 0, chat: 0, ticket: 0 };
      rn.orbit.forEach((i) => i.type !== "doc" && c[i.type]++);
      sub =
        [
          c.hunch && `${c.hunch} hunches`,
          c.ticket && `${c.ticket} klantvr.`,
          c.chat && `${c.chat} gespr.`,
        ]
          .filter(Boolean)
          .join(" · ") || "aangehaald door documenten";
    } else if (rn.kind === "rest")
      sub = `${rn.docs.length} · ${s.unused} nooit gebruikt`;
    else {
      const c = rn.orbit.filter((i) => i.type === "chat").length;
      sub = `${rn.orbit.length - c} vragen · ${c} gesprekken`;
    }
    g.append("text")
      .attr("class", "kg-kcnt")
      .attr("text-anchor", "middle")
      .attr("y", y)
      .text(sub);
    g.append("g")
      .attr("class", "kg-kplus")
      .attr("transform", `translate(${r * 0.72},${-r * 0.72})`)
      .call((b) => {
        b.append("circle").attr("r", 10);
        b.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.36em")
          .text(open ? "−" : "+");
      });
    if (rn.kind === "star" && v.lens === "risk" && s.risk.includes(rn.doc))
      lensPill(
        g,
        v.lens,
        rn.doc.fresh.label.toLowerCase() + " · nog gebruikt",
        -r - 18,
      );
    if (
      rn.kind === "star" &&
      v.lens === "expert" &&
      s.expert &&
      rn.doc.authorId === s.expert.p.id
    )
      lensPill(g, v.lens, s.expert.p.name, -r - 18);
    if (rn.kind === "gap" && v.lens === "gaps")
      lensPill(g, v.lens, "hier ontbreekt een bron", -r - 16);
    g.append("title").text(
      `${title} · klik om ${open ? "dicht" : "open"} te klappen`,
    );
    return;
  }
  const w = n.w!,
    h = n.h!,
    type = n.kind === "pill" ? n.it!.type : n.type!;
  if (n.kind === "stack")
    [8, 4].forEach((o) =>
      g
        .append("rect")
        .attr("x", -w / 2 + o)
        .attr("y", -h / 2 + o)
        .attr("width", w)
        .attr("height", h)
        .attr("rx", 10)
        .attr("fill", "#FFFFFF")
        .attr("stroke", "#E6D5BE"),
    );
  g.append("rect")
    .attr("class", "kg-card")
    .attr("x", -w / 2)
    .attr("y", -h / 2)
    .attr("width", w)
    .attr("height", h)
    .attr("rx", 10);
  g.append("rect")
    .attr("x", -w / 2 + 8)
    .attr("y", -13)
    .attr("width", 26)
    .attr("height", 26)
    .attr("rx", 7)
    .attr("fill", COL[type].soft);
  svgGlyph(
    g.append("g").attr("transform", `translate(${-w / 2 + 21},0)`),
    type,
    16,
    COL[type].strong,
  );
  if (n.kind === "pill") {
    const it = n.it!;
    g.append("text")
      .attr("class", "kg-pt")
      .attr("x", -w / 2 + 42)
      .attr("y", -3)
      .text(trunc(it.title, 27));
    g.append("text")
      .attr("class", "kg-ps")
      .attr("x", -w / 2 + 42)
      .attr("y", 13)
      .text(`${kindLabel(it)} · ${fmtDate(it.date)}`);
    if (it.fresh.k === "old")
      g.append("circle")
        .attr("cx", w / 2 - 12)
        .attr("cy", -h / 2 + 12)
        .attr("r", 4)
        .attr("fill", FRESH_COL.old);
    g.append("title").text(
      `${it.title} · ${kindLabel(it)} · ${fmtDate(it.date)}`,
    );
  } else {
    g.append("text")
      .attr("class", "kg-pt")
      .attr("x", -w / 2 + 42)
      .attr("y", -3)
      .text(`+ ${n.items!.length} ${KIND[type].plural.toLowerCase()}`);
    g.append("text")
      .attr("class", "kg-ps")
      .attr("x", -w / 2 + 42)
      .attr("y", 13)
      .text("Klik voor de volledige lijst");
  }
}
function kDim(n: KNode, v: View) {
  if (n.kind === "island")
    return v.lens !== "health" && !lensMetric(n.s!, v.lens).on;
  if (n.kind === "star" || n.kind === "rest" || n.kind === "gap")
    return (
      (!!v.open && v.open !== n.key) || !nodeMatchesLens(n.ring!, n.s!, v.lens)
    );
  return false;
}
function kIsSel(n: KNode, s: Sel) {
  if (!s) return false;
  if (s.kind === "item")
    return (
      (n.kind === "pill" && n.it!.id === s.id) ||
      (n.ring?.kind === "star" && n.ring.doc.id === s.id)
    );
  if (s.kind === "ring" || s.kind === "stack") return n.key === s.key;
  if (s.kind === "topic") return n.kind === "hub";
  return false;
}

/* ---------- inspector pieces ---------- */
function freshBar(f: { ok: number; warn: number; old: number }) {
  const t = Math.max(1, f.ok + f.warn + f.old);
  return (
    <>
      <div className="kg-mix">
        {(["ok", "warn", "old"] as const).map((k) => (
          <i
            key={k}
            style={{ width: `${(f[k] / t) * 100}%`, background: FRESH_COL[k] }}
          />
        ))}
      </div>
      <div className="kg-mix-legend">
        <span>
          <Dot color={FRESH_COL.ok} />
          Actueel {fmt(f.ok)}
        </span>
        <span>
          <Dot color={FRESH_COL.warn} />
          Nakijken {fmt(f.warn)}
        </span>
        <span>
          <Dot color={FRESH_COL.old} />
          Verouderd {fmt(f.old)}
        </span>
      </div>
    </>
  );
}
function Legend() {
  return (
    <div className="kg-legend">
      <div>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle r="15" fill="#fff" stroke="#E6D5BE" />
          <path
            d="M0,-15 A15,15 0 1 1 -12,9"
            fill="none"
            stroke={FRESH_COL.ok}
            strokeWidth="4"
          />
          <path
            d="M-12,9 A15,15 0 0 1 0,-15"
            fill="none"
            stroke={FRESH_COL.old}
            strokeWidth="4"
          />
        </svg>
        <span>
          <b>Onderwerp</b> · groter = meer kennis, de ring toont hoe actueel ze
          is
        </span>
      </div>
      <div>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle r="15" fill="none" stroke={FRESH_COL.ok} strokeWidth="2.5" />
          <circle r="11" fill={COL.doc.soft} stroke={COL.doc.c} />
          <path
            d={GLYPH.doc}
            transform="translate(-7,-7) scale(.58)"
            fill="none"
            stroke={COL.doc.strong}
            strokeWidth="2"
          />
        </svg>
        <span>
          <b>Kernbron</b> · een document waar veel naar verwezen wordt
        </span>
      </div>
      <div>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <rect
            x="-16"
            y="-9"
            width="32"
            height="18"
            rx="5"
            fill="#fff"
            stroke="#E6D5BE"
          />
          <rect
            x="-13"
            y="-6"
            width="12"
            height="12"
            rx="3"
            fill={COL.hunch.soft}
          />
        </svg>
        <span>
          <b>Hunch, klantvraag of gesprek</b> dat de bron gebruikt. Herhalingen
          worden gestapeld.
        </span>
      </div>
      <div>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle
            r="13"
            fill={COL.chat.soft}
            stroke={COL.chat.c}
            strokeDasharray="3 3"
          />
          <text
            textAnchor="middle"
            dy="0.36em"
            fontWeight="700"
            fill={COL.chat.strong}
          >
            ?
          </text>
        </svg>
        <span>
          <b>Zonder bron</b> · vragen waar geen document achter zit
        </span>
      </div>
    </div>
  );
}
function ItemRow({ it, onClick }: { it: GraphItem; onClick: () => void }) {
  return (
    <button type="button" className="kg-row" onClick={onClick}>
      <Mini kind={it.type} />
      <span className="kg-main">
        <span className="kg-name">{it.title}</span>
        <span className="kg-sub">
          {kindLabel(it)} · {fmtDate(it.date)}
          {it.fresh.k === "old" ? ` · ${it.fresh.label.toLowerCase()}` : ""}
        </span>
      </span>
    </button>
  );
}

/* ---------- the view ---------- */
export type LandscapeStart = { item?: string; topic?: string; n?: number };

function Landscape({
  model,
  start,
  onDetails,
}: {
  model: Model;
  start: LandscapeStart;
  onDetails: (f: Focus) => void;
}) {
  const router = useRouter();
  const structs = useMemo(() => structures(model), [model]);
  const [view, setView] = useState<View>({
    focus: null,
    open: null,
    pinned: null,
    lens: "health",
  });
  const [sel, setSel] = useState<Sel>(null);
  const [q, setQ] = useState("");
  const [showResults, setShowResults] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const K = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    g: G;
    gl: G;
    gn: G;
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    pos: Map<string, { x: number; y: number }>;
    scene?: ReturnType<typeof scene>;
    fitMode: "all" | "topic" | "open";
  } | null>(null);
  const clickRef = useRef<(n: KNode) => void>(() => {});
  const prevView = useRef<View | null>(null);

  /* jumps */
  const focusTopic = (tid: string) => {
    setView((v) => ({ ...v, focus: tid, open: null, pinned: null }));
    setSel({ kind: "topic", id: tid });
  };
  const overview = () => {
    setView((v) => ({ ...v, focus: null, open: null, pinned: null }));
    setSel(null);
  };
  const openRing = (key: string, tid = view.focus) => {
    const rn = tid
      ? structs.get(tid)?.ring.find((n) => n.key === key)
      : undefined;
    if (!rn) return;
    setView((v) => ({ ...v, focus: tid, open: key, pinned: null }));
    setSel(
      rn.kind === "star"
        ? { kind: "item", id: rn.doc.id }
        : { kind: "ring", key },
    );
  };
  const reveal = (id: string) => {
    const it = model.item(id);
    if (!it) return;
    const s = structs.get(it.topic);
    if (!s) return;
    const ringFor = (docId: string) =>
      s.ring.find((n) => n.kind === "star" && n.doc.id === docId)?.key ??
      "rest:" + it.topic;
    let pin = id,
      ringKey: string;
    if (it.type === "doc") ringKey = ringFor(id);
    else {
      const p = primaryDoc(model, it);
      if (!p || !s.orbit.has(p)) ringKey = "gap:" + it.topic;
      else {
        ringKey = ringFor(p);
        if (ringKey.startsWith("rest:")) pin = p;
      }
    }
    setView((v) => ({ ...v, focus: it.topic, open: ringKey, pinned: pin }));
    setSel({ kind: "item", id });
  };
  const onGo = (g: Go) => {
    if (g.to === "graph") return onDetails(g.focus);
    if (g.to === "map") return reveal(g.id);
    if (g.to === "topic") return focusTopic(g.id);
    const href = hrefFor(g);
    if (href) router.push(href);
  };

  /* start from the URL */
  useEffect(() => {
    if (start.item) reveal(start.item);
    else if (start.topic && structs.has(start.topic)) focusTopic(start.topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.item, start.topic, start.n]);

  clickRef.current = (n: KNode) => {
    if (n.kind === "island") return focusTopic(n.t!.id);
    if (n.kind === "hub") {
      setView((v) => ({ ...v, open: null, pinned: null }));
      setSel({ kind: "topic", id: n.t!.id });
      return;
    }
    if (n.kind === "star" || n.kind === "rest" || n.kind === "gap") {
      const opening = view.open !== n.key;
      setView((v) => ({ ...v, open: opening ? n.key : null, pinned: null }));
      setSel(
        n.ring!.kind === "star"
          ? { kind: "item", id: n.ring!.doc.id }
          : { kind: "ring", key: n.key },
      );
      return;
    }
    if (n.kind === "pill") return setSel({ kind: "item", id: n.it!.id });
    if (n.kind === "stack")
      setSel({
        kind: "stack",
        key: n.key,
        items: n.items!,
        type: n.type!,
        owner: n.owner!,
      });
  };

  const fit = (mode: "all" | "topic" | "open", animate = true) => {
    const k = K.current;
    const el = stage.current;
    if (!k?.scene || !el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    let set = k.scene.nodes;
    if (mode === "topic")
      set = set.filter((n) => ["hub", "star", "rest", "gap"].includes(n.kind));
    if (mode === "open" && k.scene.open)
      set = set.filter(
        (n) => n.key === k.scene!.open!.key || n.parent === k.scene!.open!.key,
      );
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const n of set) {
      if (n.w) {
        x0 = Math.min(x0, n.x - n.w / 2);
        x1 = Math.max(x1, n.x + n.w / 2);
        y0 = Math.min(y0, n.y - n.h! / 2);
        y1 = Math.max(y1, n.y + n.h! / 2);
        continue;
      }
      const capd = ["star", "rest", "gap"].includes(n.kind),
        hw = capd ? Math.max(n.r, 88) : n.r;
      x0 = Math.min(x0, n.x - hw);
      x1 = Math.max(x1, n.x + hw);
      y0 = Math.min(y0, n.y - n.r - 24);
      y1 = Math.max(y1, n.y + n.r + (capd ? 56 : 4));
    }
    const m = mode === "all" ? 48 : 32,
      bw = x1 - x0,
      bh = y1 - y0;
    const s = Math.max(
      0.25,
      Math.min(1.15, (w - 2 * m) / bw, (h - 2 * m) / bh),
    );
    const t = d3.zoomIdentity
      .translate(w / 2 - (x0 + bw / 2) * s, h / 2 - (y0 + bh / 2) * s)
      .scale(s);
    if (animate)
      k.svg
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .call(k.zoom.transform, t);
    else k.svg.call(k.zoom.transform, t);
  };

  /* mount the svg once */
  useEffect(() => {
    const el = stage.current!;
    const svg = d3
      .select(el)
      .insert("svg", ":first-child")
      .attr("role", "img")
      .attr("aria-label", "Kennislandschap") as d3.Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >;
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .extent(() => {
        const b = el.getBoundingClientRect();
        return [
          [0, 0],
          [b.width || 1, b.height || 1],
        ];
      })
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(zoom).on("dblclick.zoom", null);
    K.current = {
      svg,
      g,
      gl: g.append("g"),
      gn: g.append("g"),
      zoom,
      pos: new Map(),
      fitMode: "all",
    };
    prevView.current = null;
    let last = el.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      const b = el.getBoundingClientRect();
      if (
        Math.abs(b.width - last.width) > 4 ||
        Math.abs(b.height - last.height) > 4
      ) {
        last = b;
        fit(K.current!.fitMode, false);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      svg.remove();
      K.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* draw the scene whenever the view changes */
  useEffect(() => {
    const k = K.current;
    if (!k) return;
    const sc = scene(model.topics, structs, view);
    k.scene = sc;
    const T = d3.transition().duration(550).ease(d3.easeCubicOut);
    const prev = k.pos,
      here = new Map(sc.nodes.map((n) => [n.key, n]));
    const from = (n: KNode): { x: number; y: number } =>
      prev.get(n.key) ??
      (n.parent ? (prev.get(n.parent) ?? here.get(n.parent)) : undefined) ??
      n;
    k.gl
      .selectAll<SVGPathElement, KLink>("path.kg-kl")
      .data(sc.links, (d) => d.key)
      .join(
        (en) =>
          en
            .append("path")
            .attr("class", (d) => "kg-kl kg-" + d.kind)
            .attr("opacity", 0)
            .attr("d", kPath),
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      )
      .transition(T)
      .attr("d", kPath)
      .attr("opacity", (d) =>
        (d.kind === "spoke" || d.kind === "cites") && view.open ? 0.35 : 1,
      );
    k.gn
      .selectAll<SVGGElement, KNode>("g.kg-kn")
      .data(sc.nodes, (d) => d.key)
      .join(
        (en) => {
          const g = en
            .append("g")
            .attr("class", (d) => "kg-kn kg-" + d.kind)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("transform", (d) => {
              const f = from(d);
              return `translate(${f.x},${f.y}) scale(.5)`;
            })
            .attr("opacity", 0);
          g.on("click", (_e, d) => clickRef.current(d)).on(
            "keydown",
            (e: KeyboardEvent, d) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                clickRef.current(d);
              }
            },
          );
          return g;
        },
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      )
      .each(function (d) {
        drawK(d3.select(this), d, view);
      })
      .transition(T)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("opacity", (d) => (kDim(d, view) ? 0.3 : 1));
    k.pos = new Map(sc.nodes.map((n) => [n.key, { x: n.x, y: n.y }]));
    const p = prevView.current;
    const mode = view.open ? "open" : view.focus ? "topic" : "all";
    k.fitMode = mode;
    if (
      !p ||
      p.focus !== view.focus ||
      p.open !== view.open ||
      p.pinned !== view.pinned
    )
      fit(mode, !!p);
    prevView.current = view;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, structs, view]);

  useEffect(() => {
    K.current?.gn
      .selectAll<SVGGElement, KNode>("g.kg-kn")
      .classed("kg-sel", (d) => kIsSel(d, sel));
    inspector.current?.scrollTo({ top: 0 });
  }, [sel, view]);

  /* search */
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const order = { doc: 0, hunch: 1, chat: 2, ticket: 3 };
    const ts = model.topics
      .filter((t) => t.name.toLowerCase().includes(s))
      .slice(0, 3)
      .map((t) => ({
        kind: "topic" as const,
        id: t.id,
        name: t.name,
        sub: `Onderwerp · ${structs.get(t.id)!.list.length} items`,
      }));
    const its = model.items
      .filter(
        (it) =>
          it.title.toLowerCase().includes(s) ||
          model.authorName(it).toLowerCase().includes(s),
      )
      .sort((a, b) => order[a.type] - order[b.type] || byDateDesc(a, b))
      .slice(0, 7)
      .map((it) => ({
        kind: "item" as const,
        id: it.id,
        type: it.type,
        name: it.title,
        sub: `${kindLabel(it)} · ${model.topic(it.topic)?.name ?? ""}`,
      }));
    return [...ts, ...its];
  }, [q, model, structs]);
  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    setShowResults(false);
    setQ(r.name);
    if (r.kind === "topic") focusTopic(r.id);
    else reveal(r.id);
  };

  const L = lensById.get(view.lens)!;
  const close = () => {
    if (!view.focus) return setSel(null);
    if (view.open) {
      const rn = structs.get(view.focus)!.ring.find((n) => n.key === view.open);
      if (rn)
        return setSel(
          rn.kind === "star"
            ? { kind: "item", id: rn.doc.id }
            : { kind: "ring", key: view.open },
        );
    }
    setSel({ kind: "topic", id: view.focus });
  };
  const closeBtn = (
    <button
      type="button"
      className="kg-close"
      aria-label="Sluiten"
      onClick={close}
    >
      ×
    </button>
  );

  let insp: React.ReactNode;
  if (!sel) {
    const sorted = [...model.topics].sort((a, b) => {
      const sa = structs.get(a.id)!,
        sb = structs.get(b.id)!;
      return view.lens === "health"
        ? sb.list.length - sa.list.length
        : lensMetric(sb, view.lens).v - lensMetric(sa, view.lens).v;
    });
    const max =
      d3.max(
        model.topics,
        (t) => lensMetric(structs.get(t.id)!, view.lens).v,
      ) || 1;
    const counts = { doc: 0, chat: 0, hunch: 0, ticket: 0 };
    model.items.forEach((i) => counts[i.type]++);
    insp = (
      <>
        <div className="kg-eyebrow">Kennisbank</div>
        <h2>Waar zit onze kennis?</h2>
        <p>
          {fmt(model.items.length)} kennisitems uit SharePoint, Teams, Outlook,
          DevOps en Hunch: {counts.doc} documenten, {counts.chat} gesprekken,{" "}
          {counts.hunch} hunches en {counts.ticket} klantvragen, gegroepeerd per
          onderwerp. Klik op een onderwerp om de kernbronnen te zien, en op een
          bron om te zien wie en wat ernaar verwijst.
        </p>
        <Legend />
        <h3>{L.label}</h3>
        <p>{L.help}</p>
        <div className="kg-rows">
          {sorted.map((t) => {
            const s = structs.get(t.id)!,
              m = lensMetric(s, view.lens);
            const old = s.fresh.old / Math.max(1, s.list.length);
            return (
              <button
                type="button"
                key={t.id}
                className="kg-row"
                onClick={() => focusTopic(t.id)}
              >
                <span className="kg-main">
                  <span className="kg-name">{t.name}</span>
                  <span className="kg-bar">
                    <i
                      style={{
                        width: `${((m.v / (view.lens === "health" ? d3.max(model.topics, (x) => structs.get(x.id)!.list.length)! : max)) * 100).toFixed(1)}%`,
                        background: view.lens === "health" ? COL.doc.c : L.col,
                      }}
                    />
                  </span>
                  <span className="kg-sub">
                    {view.lens === "health"
                      ? `${Math.round(old * 100)}% verouderd of vervangen`
                      : m.text}
                  </span>
                </span>
                <span className="kg-num">{fmt(s.list.length)}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (sel.kind === "topic") {
    const st = structs.get(sel.id)!;
    const sig: {
      tone: "ok" | "warn" | "danger";
      text: string;
      act?: () => void;
    }[] = [];
    if (st.gaps.length)
      sig.push({
        tone: "warn",
        text: `${st.gaps.length} ${st.gaps.length === 1 ? "vraag of gesprek verwijst" : "vragen en gesprekken verwijzen"} naar geen enkel document.`,
        act: () => openRing("gap:" + st.t.id),
      });
    if (st.risk.length)
      sig.push({
        tone: "danger",
        text: `${st.risk.length} verouderde ${st.risk.length === 1 ? "bron wordt" : "bronnen worden"} nog gebruikt.`,
        act: () => reveal(st.risk[0].id),
      });
    if (st.expert && st.expert.share >= 0.5 && st.docs.length >= 2)
      sig.push({
        tone: "warn",
        text: `${Math.round(st.expert.share * 100)}% van de documenten komt van ${st.expert.p.name}.`,
        act: () => onGo({ to: "org", kind: "person", id: st.expert!.p.id }),
      });
    if (st.stars.length)
      sig.push({
        tone: "ok",
        text: `${Math.round(st.share * 100)}% van de hunches, klantvragen en gesprekken steunt op de ${st.stars.length} ${st.stars.length === 1 ? "kernbron" : "kernbronnen"}.`,
      });
    insp = (
      <>
        {closeBtn}
        <div className="kg-eyebrow">Onderwerp</div>
        <h2>{st.t.name}</h2>
        <p>
          {fmt(st.list.length)} items · {fmt(st.docs.length)} documenten,
          waarvan {fmt(st.unused)} nooit gebruikt.
        </p>
        {freshBar(st.fresh)}
        <div className="kg-signals">
          {sig.map((x, i) =>
            x.act ? (
              <button
                key={i}
                type="button"
                className={`kg-signal kg-${x.tone}`}
                onClick={x.act}
              >
                {x.text}
              </button>
            ) : (
              <div key={i} className={`kg-signal kg-${x.tone}`}>
                {x.text}
              </div>
            ),
          )}
        </div>
        {st.stars.length > 0 && (
          <>
            <h3>
              Kernbronnen <span className="kg-count">{st.stars.length}</span>
            </h3>
            <div className="kg-rows">
              {st.stars.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  className="kg-row"
                  onClick={() => openRing("star:" + d.id)}
                >
                  <Mini kind="doc" />
                  <span className="kg-main">
                    <span className="kg-name">{d.title}</span>
                    <span className="kg-sub">
                      {st.score.get(d.id)} verwijzingen ·{" "}
                      {d.fresh.label.toLowerCase()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {st.authors.length > 0 && (
          <>
            <h3>Wie schrijft hierover?</h3>
            <div className="kg-rows">
              {st.authors.slice(0, 3).map((x) => (
                <button
                  type="button"
                  key={x.p.id}
                  className="kg-row"
                  onClick={() => onDetails({ kind: "person", id: x.p.id })}
                >
                  <Mini kind="person" initials={x.p.initials} />
                  <span className="kg-main">
                    <span className="kg-name">{x.p.name}</span>
                    <span className="kg-sub">{model.teamLabel(x.p)}</span>
                  </span>
                  <span className="kg-num">{x.k} doc.</span>
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  } else if (sel.kind === "ring") {
    const rn = structs.get(view.focus!)?.ring.find((n) => n.key === sel.key);
    if (rn?.kind === "gap") {
      const c = { hunch: 0, chat: 0, ticket: 0 };
      rn.orbit.forEach((i) => i.type !== "doc" && c[i.type]++);
      insp = (
        <>
          {closeBtn}
          <div className="kg-eyebrow">Zonder bron</div>
          <h2>{rn.orbit.length} vragen zonder document</h2>
          <p>
            Deze hunches, klantvragen en gesprekken verwijzen naar geen enkel
            document in dit onderwerp. Vaak ontbreekt hier een bron, of is ze
            niet vindbaar.
          </p>
          <div className="kg-stats">
            <div className="kg-stat">
              <b>{c.hunch}</b>
              <span>hunches</span>
            </div>
            <div className="kg-stat">
              <b>{c.ticket}</b>
              <span>klantvragen</span>
            </div>
            <div className="kg-stat">
              <b>{c.chat}</b>
              <span>gesprekken</span>
            </div>
          </div>
          <h3>Meest recent</h3>
          <div className="kg-rows">
            {rn.orbit.slice(0, 25).map((it) => (
              <ItemRow key={it.id} it={it} onClick={() => reveal(it.id)} />
            ))}
          </div>
        </>
      );
    } else if (rn?.kind === "rest") {
      insp = (
        <>
          {closeBtn}
          <div className="kg-eyebrow">Overige documenten</div>
          <h2>{rn.docs.length} documenten buiten de kern</h2>
          <p>
            Documenten waar weinig of niets naar verwijst.{" "}
            {structs.get(view.focus!)!.unused} ervan werden nooit gebruikt in
            een hunch, klantvraag of gesprek: kandidaten om te archiveren of
            samen te voegen.
          </p>
          <div className="kg-rows">
            {rn.docs.slice(0, 30).map((it) => (
              <ItemRow
                key={it.id}
                it={it}
                onClick={() => setSel({ kind: "item", id: it.id })}
              />
            ))}
          </div>
        </>
      );
    }
  } else if (sel.kind === "stack") {
    const owner = structs
      .get(view.focus!)
      ?.ring.find((n) => n.key === sel.owner);
    const ol =
      owner?.kind === "star"
        ? owner.doc.title
        : owner?.kind === "gap"
          ? "Zonder bron"
          : "Overige documenten";
    insp = (
      <>
        {closeBtn}
        <div className="kg-eyebrow">{KIND[sel.type].plural} · gestapeld</div>
        <h2>
          {sel.items.length} {KIND[sel.type].plural.toLowerCase()}
        </h2>
        <p>Bij “{ol}”. Klik op een item om het naast de bron te tonen.</p>
        <div className="kg-rows">
          {sel.items.slice(0, 60).map((it) => (
            <ItemRow key={it.id} it={it} onClick={() => reveal(it.id)} />
          ))}
        </div>
      </>
    );
  } else {
    const it = model.item(sel.id);
    if (it) {
      let stats: React.ReactNode = null;
      if (it.type === "doc") {
        const orb = structs.get(it.topic)?.orbit.get(it.id) ?? [];
        const c = { hunch: 0, chat: 0, ticket: 0 };
        orb.forEach((i) => i.type !== "doc" && c[i.type]++);
        const used = model.incoming(it.id);
        stats = (
          <div className="kg-stats">
            <div className="kg-stat">
              <b>
                {
                  used.filter((r) => model.item(r.from)?.type === "hunch")
                    .length
                }
              </b>
              <span>hunches</span>
            </div>
            <div className="kg-stat">
              <b>
                {
                  used.filter((r) => model.item(r.from)?.type === "ticket")
                    .length
                }
              </b>
              <span>klantvragen</span>
            </div>
            <div className="kg-stat">
              <b>
                {used.filter((r) => model.item(r.from)?.type === "chat").length}
              </b>
              <span>gesprekken</span>
            </div>
          </div>
        );
      }
      insp = (
        <>
          {closeBtn}
          <ItemDetails
            model={model}
            it={it}
            onGo={onGo}
            place="map"
            stats={stats}
          />
        </>
      );
    }
  }

  /* trail */
  const t = view.focus ? model.topic(view.focus) : undefined;
  const openRn =
    view.focus && view.open
      ? structs.get(view.focus)?.ring.find((n) => n.key === view.open)
      : undefined;
  const openLabel = openRn
    ? openRn.kind === "star"
      ? openRn.doc.title
      : openRn.kind === "rest"
        ? "Overige documenten"
        : "Zonder bron"
    : "";

  return (
    <div className="kg-view">
      <section className="kg-stage">
        <div className="kg-stage-bar">
          <div className="kg-search-wrap">
            <label className="kg-search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20 L16 16" />
              </svg>
              <input
                type="search"
                placeholder="Zoek een document, gesprek of onderwerp"
                autoComplete="off"
                value={q}
                aria-label="Zoek in de kennisbank"
                onChange={(e) => {
                  setQ(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    choose(0);
                  }
                  if (e.key === "Escape") setShowResults(false);
                }}
              />
            </label>
            {showResults && q.trim().length >= 2 && (
              <div className="kg-results">
                {results.length ? (
                  results.map((r, i) => (
                    <button
                      type="button"
                      key={r.kind + r.id}
                      className="kg-row"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(i)}
                    >
                      {r.kind === "topic" ? (
                        <span
                          className="kg-mini"
                          style={{ background: "var(--surface-sunken)" }}
                        >
                          <Glyph kind="unit" color="#12343B" size={15} />
                        </span>
                      ) : (
                        <Mini kind={r.type} />
                      )}
                      <span className="kg-main">
                        <span className="kg-name">{r.name}</span>
                        <span className="kg-sub">{r.sub}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="kg-empty">Niets gevonden voor “{q}”.</div>
                )}
              </div>
            )}
          </div>
          <div
            className="kg-chips"
            role="group"
            aria-label="Bekijk de kaart vanuit een vraag"
          >
            {LENSES.map((l) => (
              <button
                type="button"
                key={l.id}
                className="kg-chip kg-lens"
                aria-pressed={l.id === view.lens}
                onClick={() => setView((v) => ({ ...v, lens: l.id }))}
              >
                {l.id !== "health" && <Dot color={l.col} />}
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="kg-trail">
          {!t ? (
            <>
              <span className="kg-cur">Alle onderwerpen</span>
              <span className="kg-sep kg-muted">
                · klik op een onderwerp om het te openen
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="kg-back"
                onClick={() => (view.open ? focusTopic(t.id) : overview())}
              >
                ← Terug
              </button>
              <button type="button" onClick={overview}>
                Alle onderwerpen
              </button>
              <span className="kg-sep">›</span>
              {view.open ? (
                <>
                  <button type="button" onClick={() => focusTopic(t.id)}>
                    {t.name}
                  </button>
                  <span className="kg-sep">›</span>
                  <span className="kg-cur">{trunc(openLabel, 40)}</span>
                </>
              ) : (
                <span className="kg-cur">{t.name}</span>
              )}
            </>
          )}
        </div>
        <div className="kg-canvas kg-dotgrid" ref={stage}>
          <div className="kg-legend-note">
            Klik om open te klappen · het beeld past zich automatisch aan
          </div>
          <ZoomControls
            onZoom={(z) => {
              const k = K.current;
              if (!k) return;
              if (z === "fit") fit(k.fitMode);
              else
                k.svg
                  .transition()
                  .duration(250)
                  .call(k.zoom.scaleBy, z === "in" ? 1.3 : 1 / 1.3);
            }}
          />
        </div>
      </section>
      <aside className="kg-inspector" ref={inspector} aria-live="polite">
        {insp}
      </aside>
    </div>
  );
}

/** The Kennisbank tab: every knowledge item, grouped by topic and source. */
export function KnowledgeLandscape({ start }: { start: LandscapeStart }) {
  const { model, error, retry } = useKnowledge();
  const [details, setDetails] = useState<Focus | null>(null);
  const [jump, setJump] = useState<LandscapeStart>(start);
  return (
    <>
      {model ? (
        <Landscape model={model} start={jump} onDetails={setDetails} />
      ) : (
        <div className="kg-view">
          <div className="kg-loading">
            {error ? (
              <ErrorNotice error={error} onRetry={retry} />
            ) : (
              <>
                <Spinner /> Kennisbank laden…
              </>
            )}
          </div>
        </div>
      )}
      {details && (
        <KnowledgeDetailsModal
          focus={details}
          onClose={() => setDetails(null)}
          onNavigate={(g) => {
            if (g.to !== "map" && g.to !== "topic") return false;
            setDetails(null);
            setJump((j) => ({
              ...(g.to === "map" ? { item: g.id } : { topic: g.id }),
              n: (j.n ?? 0) + 1,
            }));
            return true;
          }}
        />
      )}
    </>
  );
}
