"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type { GraphPerson, GraphUnit } from "@/lib/types";
import {
  COL,
  ITEM_TYPES,
  KIND,
  LEVEL,
  fmt,
  trunc,
  type Focus,
  type Go,
  type Model,
} from "./model";
import { Dot, Glyph, Mini, ZoomControls } from "./bits";
import { PersonDetails } from "./details";
import { KnowledgeDetailsModal, hrefFor } from "./details-modal";
import { ErrorNotice, Spinner } from "../ui";
import { useKnowledge } from "./use-knowledge";

const UW = 252,
  UH = 68,
  PW = 232,
  PH = 44,
  COLW = 316,
  CW = PW + 12,
  CH = PH + 8;
type ONode = {
  id: string;
  kind: "unit" | "grid";
  u: GraphUnit;
  children?: ONode[];
};
type HNode = d3.HierarchyPointNode<ONode>;
type Sel = { kind: "unit" | "person"; id: string };
type G = d3.Selection<SVGGElement, unknown, null, undefined>;

/** The Organigram tab: a collapsible tree of the organisation from Entra. */
function OrgChart({
  model,
  start,
  onDetails,
}: {
  model: Model;
  start: Sel | null;
  onDetails: (f: Focus) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([model.root.id]),
  );
  const [sel, setSel] = useState<Sel>({ kind: "unit", id: model.root.id });
  const [anchor, setAnchor] = useState<{ id: string; n: number } | null>(null);
  const [q, setQ] = useState("");
  const [showResults, setShowResults] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const O = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    g: G;
    gl: G;
    gn: G;
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    pos: Map<string, { x: number; y: number }>;
    nodes: HNode[];
    fitted: boolean;
  } | null>(null);
  const act = useRef({ unit: (_n: ONode) => {}, person: (_id: string) => {} });

  const gridDims = (u: GraphUnit) => {
    const n = model.membersOf(u.id).length;
    const rows = Math.min(n, Math.max(1, Math.ceil(Math.sqrt(n * 3))));
    const cols = Math.ceil(n / Math.max(1, rows));
    return { rows, cols, w: cols * CW - 12, h: rows * CH - 8 };
  };
  const nodeH = (n: ONode) => (n.kind === "unit" ? UH : gridDims(n.u).h);
  const nodeW = (n: ONode) => (n.kind === "unit" ? UW : gridDims(n.u).w);
  const kidsOf = (u: GraphUnit) =>
    model.childrenOf(u.id).length || model.membersOf(u.id).length;

  const reveal = (s: Sel) => {
    let u: GraphUnit | undefined;
    const next = new Set(expanded);
    if (s.kind === "person") {
      const p = model.person(s.id);
      if (!p) return;
      u = model.unit(p.unitId);
      if (u) next.add(u.id);
    } else u = model.unit(s.id);
    if (!u) return;
    let a = model.parentOf(u);
    while (a) {
      next.add(a.id);
      a = model.parentOf(a);
    }
    setExpanded(next);
    setSel(s);
    setAnchor((x) => ({ id: u!.id, n: (x?.n ?? 0) + 1 }));
  };
  const onGo = (g: Go) => {
    if (g.to === "graph") return onDetails(g.focus);
    if (g.to === "org") return reveal({ kind: g.kind, id: g.id });
    const href = hrefFor(g);
    if (href) router.push(href);
  };
  useEffect(() => {
    if (start) reveal(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  act.current.unit = (n: ONode) => {
    const u = n.u;
    if (kidsOf(u)) {
      setExpanded((e) => {
        const next = new Set(e);
        if (next.has(u.id)) {
          const collapse = (x: GraphUnit) => {
            next.delete(x.id);
            model.childrenOf(x.id).forEach(collapse);
          };
          collapse(u);
        } else next.add(u.id);
        return next;
      });
    }
    setSel({ kind: "unit", id: u.id });
    setAnchor((x) => ({ id: u.id, n: (x?.n ?? 0) + 1 }));
  };
  act.current.person = (id: string) => setSel({ kind: "person", id });

  const size = () => {
    const b = stage.current!.getBoundingClientRect();
    return { w: b.width || 1, h: b.height || 1 };
  };
  const fitAll = (animate = true) => {
    const o = O.current;
    if (!o) return;
    const b = o.g.node()!.getBBox();
    if (!b.width) return;
    const { w, h } = size();
    const k = Math.max(
      0.15,
      Math.min(1, (w - 60) / b.width, (h - 60) / b.height),
    );
    const t = d3.zoomIdentity
      .translate(
        w / 2 - (b.x + b.width / 2) * k,
        h / 2 - (b.y + b.height / 2) * k,
      )
      .scale(k);
    if (animate) o.svg.transition().duration(500).call(o.zoom.transform, t);
    else o.svg.call(o.zoom.transform, t);
  };
  /* Re-frame around a card and its visible children, so an expansion never runs off-screen. */
  const focusFit = (id: string) => {
    const o = O.current;
    if (!o) return;
    const me = o.nodes.find((d) => d.data.id === id);
    if (!me) return;
    const group = [me, ...(me.children ?? [])];
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const d of group) {
      const hh = nodeH(d.data),
        pad = d.data.kind === "grid" ? 10 : 0;
      x0 = Math.min(x0, d.y - pad);
      x1 = Math.max(x1, d.y + nodeW(d.data) + pad + 16);
      y0 = Math.min(y0, d.x - hh / 2 - pad);
      y1 = Math.max(y1, d.x + hh / 2 + pad);
    }
    const { w, h } = size();
    const m = 36,
      bw = x1 - x0,
      bh = y1 - y0,
      cur = d3.zoomTransform(o.svg.node()!).k;
    const k = me.children
      ? Math.max(0.25, Math.min(1, (w - 2 * m) / bw, (h - 2 * m) / bh))
      : Math.max(0.6, Math.min(1, cur));
    const t = d3.zoomIdentity
      .translate(w / 2 - (x0 + bw / 2) * k, h / 2 - (y0 + bh / 2) * k)
      .scale(k);
    o.svg
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .call(o.zoom.transform, t);
  };

  useEffect(() => {
    const el = stage.current!;
    const svg = d3
      .select(el)
      .insert("svg", ":first-child")
      .attr("role", "img")
      .attr("aria-label", "Organigram") as d3.Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >;
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 2])
      .extent(() => {
        const b = el.getBoundingClientRect();
        return [
          [0, 0],
          [b.width || 1, b.height || 1],
        ];
      })
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(zoom).on("dblclick.zoom", null);
    O.current = {
      svg,
      g,
      gl: g.append("g"),
      gn: g.append("g"),
      zoom,
      pos: new Map(),
      nodes: [],
      fitted: false,
    };
    return () => {
      svg.remove();
      O.current = null;
    };
  }, []);

  /* draw the tree */
  useEffect(() => {
    const o = O.current;
    if (!o) return;
    const tree = (u: GraphUnit): ONode => {
      const n: ONode = { id: u.id, kind: "unit", u };
      if (expanded.has(u.id)) {
        const kids = model.childrenOf(u.id);
        n.children = kids.length
          ? kids.map(tree)
          : model.membersOf(u.id).length
            ? [{ id: u.id + "-grid", kind: "grid", u }]
            : undefined;
      }
      return n;
    };
    const h = d3.hierarchy(tree(model.root));
    const laid = d3
      .tree<ONode>()
      .nodeSize([1, COLW])
      .separation(
        (a, b) =>
          (nodeH(a.data) + nodeH(b.data)) / 2 +
          (a.parent === b.parent ? 12 : 30),
      )(h);
    const nodes = laid.descendants(),
      links = laid.links(),
      prev = o.pos;
    const startOf = (d: HNode) => {
      let a = d.parent;
      while (a) {
        const p = prev.get(a.data.id);
        if (p) return p;
        a = a.parent;
      }
      return { x: d.x, y: d.y };
    };
    const T = d3.transition().duration(450).ease(d3.easeCubicOut);
    const linkPath = (s: HNode, t: HNode) => {
      const x0 = s.y + UW,
        y0 = s.x,
        x1 = t.y - (t.data.kind === "grid" ? 10 : 0),
        y1 = t.x,
        m = (x0 + x1) / 2;
      return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}`;
    };
    o.gl
      .selectAll<SVGPathElement, d3.HierarchyPointLink<ONode>>("path.kg-olink")
      .data(links, (d) => d.target.data.id)
      .join(
        (en) =>
          en
            .append("path")
            .attr("class", "kg-olink")
            .attr("opacity", 0)
            .attr("d", (d) => linkPath(d.source, d.target)),
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      )
      .transition(T)
      .attr("opacity", 1)
      .attr("d", (d) => linkPath(d.source, d.target));

    const tr = (d: HNode) => `translate(${d.y},${d.x - nodeH(d.data) / 2})`;
    const personCard = (g: G, p: GraphPerson) => {
      g.append("rect")
        .attr("class", "kg-card")
        .attr("width", PW)
        .attr("height", PH)
        .attr("rx", 10);
      g.append("circle")
        .attr("cx", 22)
        .attr("cy", PH / 2)
        .attr("r", 14)
        .attr("fill", COL.person.soft);
      g.append("text")
        .attr("x", 22)
        .attr("y", PH / 2)
        .attr("dy", "0.36em")
        .attr("text-anchor", "middle")
        .attr("fill", COL.person.strong)
        .style("font", "700 11px var(--font-sans)")
        .text(p.initials);
      g.append("text")
        .attr("class", "kg-t1")
        .attr("x", 44)
        .attr("y", 19)
        .text(trunc(p.name, 24));
      g.append("text")
        .attr("class", "kg-t2")
        .attr("x", 44)
        .attr("y", 34)
        .text(trunc(p.role, 30));
      const made = model.authored(p.id).length;
      if (made)
        g.append("text")
          .attr("class", "kg-hc")
          .attr("x", PW - 12)
          .attr("y", 19)
          .attr("text-anchor", "end")
          .attr("fill", COL.doc.strong)
          .text(made + "×");
      if (p.awayUntil)
        g.append("circle")
          .attr("cx", 33)
          .attr("cy", PH / 2 - 10)
          .attr("r", 4.5)
          .attr("fill", "#FFC53D")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      g.append("title").text(
        `${p.name} · ${p.role}${made ? ` · ${made} kennisitems` : ""}${p.awayUntil ? " · afwezig" : ""}`,
      );
    };
    const card = (g: G, n: ONode) => {
      if (n.kind === "grid") {
        const gd = gridDims(n.u);
        g.append("rect")
          .attr("x", -10)
          .attr("y", -10)
          .attr("width", gd.w + 20)
          .attr("height", gd.h + 20)
          .attr("rx", 16)
          .attr("fill", "#FFF8EF")
          .attr("stroke", "#E6D5BE")
          .attr("stroke-dasharray", "4 4");
        model.membersOf(n.u.id).forEach((pid, i) => {
          const p = model.person(pid)!;
          const pg = g
            .append("g")
            .datum(p)
            .attr("class", "kg-pcard")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr(
              "transform",
              `translate(${Math.floor(i / gd.rows) * CW},${(i % gd.rows) * CH})`,
            );
          personCard(pg as unknown as G, p);
          pg.on("click", (e: MouseEvent) => {
            e.stopPropagation();
            act.current.person(p.id);
          }).on("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              act.current.person(p.id);
            }
          });
        });
        return;
      }
      const u = n.u,
        head = u.headId ? model.person(u.headId) : undefined,
        st = model.statsOf(u);
      g.append("rect")
        .attr("class", "kg-card")
        .attr("width", UW)
        .attr("height", UH)
        .attr("rx", 12);
      g.append("text")
        .attr("class", "kg-lvl")
        .attr("x", 14)
        .attr("y", 19)
        .text(LEVEL[u.level]);
      g.append("text")
        .attr("class", "kg-hc")
        .attr("x", UW - 16)
        .attr("y", 19)
        .attr("text-anchor", "end")
        .text(fmt(st.size) + " pers.");
      g.append("text")
        .attr("class", "kg-t1")
        .attr("x", 14)
        .attr("y", 38)
        .text(trunc(u.name, 27));
      const kids = model.childrenOf(u.id).length;
      g.append("text")
        .attr("class", "kg-t2")
        .attr("x", 14)
        .attr("y", 55)
        .text(
          trunc(
            head
              ? "Leiding: " + head.name
              : `${kids} ${u.level === 0 ? (kids === 1 ? "afdeling" : "afdelingen") : kids === 1 ? "team" : "teams"}`,
            34,
          ),
        );
      const tot = ITEM_TYPES.reduce((s, t) => s + st.types[t], 0) || 1;
      let x = 14;
      const bw = UW - 28;
      const bar = g.append("g").attr("transform", `translate(0,${UH - 6})`);
      bar
        .append("rect")
        .attr("x", 14)
        .attr("width", bw)
        .attr("height", 3)
        .attr("rx", 1.5)
        .attr("fill", "#F6EBDC");
      ITEM_TYPES.forEach((t) => {
        const w = (bw * st.types[t]) / tot;
        if (w > 0)
          bar
            .append("rect")
            .attr("x", x)
            .attr("width", w)
            .attr("height", 3)
            .attr("fill", COL[t].c);
        x += w;
      });
      const b = g
        .append("g")
        .attr("class", "kg-badge")
        .attr("transform", `translate(${UW},${UH / 2})`);
      b.append("circle").attr("r", 14);
      b.append("text").attr("text-anchor", "middle").attr("dy", "0.36em");
      g.append("title").text(
        `${u.name} · ${fmt(st.size)} medewerkers${head ? ` · leiding: ${head.name}` : ""}`,
      );
    };
    const selN = o.gn
      .selectAll<SVGGElement, HNode>("g.kg-onode")
      .data(nodes, (d) => d.data.id)
      .join(
        (en) => {
          const g = en
            .append("g")
            .attr("class", (d) =>
              d.data.kind === "unit" ? "kg-onode" : "kg-onode kg-grid",
            )
            .attr("opacity", 0)
            .attr("tabindex", (d) => (d.data.kind === "unit" ? 0 : null))
            .attr("role", (d) => (d.data.kind === "unit" ? "button" : null))
            .attr("transform", (d) => {
              const s = startOf(d);
              return `translate(${s.y},${s.x - nodeH(d.data) / 2})`;
            });
          g.each(function (d) {
            card(d3.select(this) as unknown as G, d.data);
          });
          g.on(
            "click",
            (_e, d) => d.data.kind === "unit" && act.current.unit(d.data),
          ).on("keydown", (e: KeyboardEvent, d) => {
            if (
              d.data.kind === "unit" &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              act.current.unit(d.data);
            }
          });
          return g;
        },
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      );
    selN.transition(T).attr("opacity", 1).attr("transform", tr);
    selN.each(function (d) {
      const n = d.data;
      if (n.kind !== "unit") return;
      const g = d3.select(this),
        kids = kidsOf(n.u);
      g.select(".kg-badge").attr("display", kids ? null : "none");
      g.select(".kg-badge text").text(expanded.has(n.id) ? "−" : "+" + kids);
    });
    o.nodes = nodes;
    o.pos = new Map(nodes.map((d) => [d.data.id, { x: d.x, y: d.y }]));
    if (!o.fitted) {
      o.fitted = true;
      requestAnimationFrame(() => setTimeout(() => fitAll(false), 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, expanded]);

  useEffect(() => {
    if (anchor) setTimeout(() => focusFit(anchor.id), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  /* selection marks */
  useEffect(() => {
    const o = O.current;
    if (!o) return;
    const p = sel.kind === "person" ? model.person(sel.id) : undefined;
    o.gn
      .selectAll<SVGGElement, HNode>("g.kg-onode")
      .classed(
        "kg-sel",
        (d) =>
          d.data.kind === "unit" &&
          (sel.kind === "unit"
            ? d.data.id === sel.id
            : !!p?.isHead && d.data.u.headId === sel.id),
      );
    o.gn
      .selectAll<SVGGElement, GraphPerson>("g.kg-pcard")
      .classed("kg-sel", (d) => sel.kind === "person" && d.id === sel.id);
    inspector.current?.scrollTo({ top: 0 });
  }, [sel, expanded, model]);

  /* search */
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const us = model.units
      .filter((u) => u.level && u.name.toLowerCase().includes(s))
      .slice(0, 4)
      .map((u) => ({
        kind: "unit" as const,
        id: u.id,
        name: u.name,
        sub: `${LEVEL[u.level]} · ${model.parentOf(u)?.name ?? ""}`,
      }));
    const ps = model.people
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) || p.role.toLowerCase().includes(s),
      )
      .slice(0, 7)
      .map((p) => ({
        kind: "person" as const,
        id: p.id,
        name: p.name,
        sub: `${p.role} · ${model.teamLabel(p)}`,
        initials: p.initials,
      }));
    return [...ps, ...us];
  }, [q, model]);
  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    setShowResults(false);
    setQ(r.name);
    reveal({ kind: r.kind, id: r.id });
  };

  /* inspector */
  let insp: React.ReactNode = null;
  if (sel.kind === "person") {
    const p = model.person(sel.id);
    if (p) insp = <PersonDetails model={model} p={p} onGo={onGo} place="org" />;
  } else {
    const u = model.unit(sel.id);
    if (u) {
      const head = u.headId ? model.person(u.headId) : undefined;
      const st = model.statsOf(u);
      const tot = ITEM_TYPES.reduce((a, t) => a + st.types[t], 0);
      const tops = Object.entries(st.topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const tmax = tops.length ? tops[0][1] : 1;
      const sharers = model
        .peopleIn(u)
        .filter((p) => model.authored(p.id).length)
        .sort(
          (a, b) => model.authored(b.id).length - model.authored(a.id).length,
        )
        .slice(0, 4);
      const kids = model.childrenOf(u.id);
      insp = (
        <>
          <div className="kg-eyebrow">{LEVEL[u.level]}</div>
          <h2>{u.name}</h2>
          {u.level > 0 && (
            <div className="kg-crumbs">
              {model
                .unitPath(u)
                .slice(0, -1)
                .map((x, i) => (
                  <span key={x.id}>
                    {i > 0 && <span aria-hidden="true">›</span>}
                    <button
                      type="button"
                      onClick={() => reveal({ kind: "unit", id: x.id })}
                    >
                      {x.name}
                    </button>
                  </span>
                ))}
            </div>
          )}
          {head && (
            <div className="kg-rows" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="kg-row"
                onClick={() => reveal({ kind: "person", id: head.id })}
              >
                <Mini kind="person" initials={head.initials} />
                <span className="kg-main">
                  <span className="kg-name">{head.name}</span>
                  <span className="kg-sub">{head.role}</span>
                </span>
              </button>
            </div>
          )}
          <div className="kg-stats">
            <div className="kg-stat">
              <b>{fmt(st.size)}</b>
              <span>mensen</span>
            </div>
            <div className="kg-stat">
              <b>{kids.length || model.membersOf(u.id).length}</b>
              <span>
                {kids.length
                  ? u.level === 0
                    ? "afdelingen"
                    : "teams"
                  : "teamleden"}
              </span>
            </div>
            <div className="kg-stat">
              <b>{fmt(tot)}</b>
              <span>kennisitems</span>
            </div>
          </div>
          {tot > 0 && (
            <>
              <h3>Kennismix</h3>
              <div className="kg-mix">
                {ITEM_TYPES.map((t) => (
                  <i
                    key={t}
                    style={{
                      width: `${(st.types[t] / tot) * 100}%`,
                      background: COL[t].c,
                    }}
                  />
                ))}
              </div>
              <div className="kg-mix-legend">
                {ITEM_TYPES.map((t) => (
                  <span key={t}>
                    <Dot color={COL[t].c} />
                    {KIND[t].plural} {fmt(st.types[t])}
                  </span>
                ))}
              </div>
            </>
          )}
          {tops.length > 0 && (
            <>
              <h3>
                Waar dit {u.level === 2 ? "team" : "onderdeel"} over schrijft
              </h3>
              <div className="kg-rows">
                {tops.map(([id, k]) => {
                  const t = model.topic(id);
                  return t ? (
                    <button
                      type="button"
                      key={id}
                      className="kg-row"
                      onClick={() => onGo({ to: "topic", id })}
                    >
                      <span className="kg-main">
                        <span className="kg-name">{t.name}</span>
                        <span className="kg-bar">
                          <i
                            style={{
                              width: `${((k / tmax) * 100).toFixed(0)}%`,
                            }}
                          />
                        </span>
                      </span>
                      <span className="kg-num">{fmt(k)}</span>
                    </button>
                  ) : null;
                })}
              </div>
            </>
          )}
          {sharers.length > 0 && (
            <>
              <h3>Grootste kennisdelers</h3>
              <div className="kg-rows">
                {sharers.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="kg-row"
                    onClick={() => reveal({ kind: "person", id: p.id })}
                  >
                    <Mini kind="person" initials={p.initials} />
                    <span className="kg-main">
                      <span className="kg-name">{p.name}</span>
                      <span className="kg-sub">{model.teamLabel(p)}</span>
                    </span>
                    <span className="kg-num">
                      {model.authored(p.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {head && (
            <div className="kg-btn-row">
              <button
                type="button"
                className="kg-btn kg-primary"
                onClick={() => onDetails({ kind: "person", id: head.id })}
              >
                Verbanden van {head.first}
              </button>
            </div>
          )}
        </>
      );
    }
  }

  const nTeams = model.units.filter((u) => u.level === 2).length;
  const nDepts = model.units.filter((u) => u.level === 1).length;
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
                placeholder="Zoek een collega of team"
                autoComplete="off"
                aria-label="Zoek een collega of team"
                value={q}
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
                      {r.kind === "person" ? (
                        <Mini kind="person" initials={r.initials} />
                      ) : (
                        <span
                          className="kg-mini"
                          style={{ background: COL.unit.soft }}
                        >
                          <Glyph
                            kind="unit"
                            color={COL.unit.strong}
                            size={15}
                          />
                        </span>
                      )}
                      <span className="kg-main">
                        <span className="kg-name">{r.name}</span>
                        <span className="kg-sub">{r.sub}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="kg-empty">Niemand gevonden voor “{q}”.</div>
                )}
              </div>
            )}
          </div>
          <div className="kg-org-stats">
            <b>{fmt(model.people.length)}</b> medewerkers · <b>{nDepts}</b>{" "}
            afdelingen · <b>{nTeams}</b> teams
          </div>
        </div>
        <div className="kg-canvas kg-dotgrid" ref={stage}>
          <div className="kg-legend-note">
            Klik op een kaart om open te klappen · de gekleurde lijn toont de
            kennismix
          </div>
          <ZoomControls
            onZoom={(z) => {
              const o = O.current;
              if (!o) return;
              if (z === "fit") fitAll();
              else
                o.svg
                  .transition()
                  .duration(250)
                  .call(o.zoom.scaleBy, z === "in" ? 1.3 : 1 / 1.3);
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

export function KnowledgeOrgChart({ start }: { start: Sel | null }) {
  const { model, error, retry } = useKnowledge();
  const [details, setDetails] = useState<Focus | null>(null);
  const [jump, setJump] = useState<Sel | null>(start);
  return (
    <>
      {model ? (
        <OrgChart model={model} start={jump} onDetails={setDetails} />
      ) : (
        <div className="kg-view">
          <div className="kg-loading">
            {error ? (
              <ErrorNotice error={error} onRetry={retry} />
            ) : (
              <>
                <Spinner /> Organigram laden…
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
            if (g.to !== "org") return false;
            setDetails(null);
            setJump({ kind: g.kind, id: g.id });
            return true;
          }}
        />
      )}
    </>
  );
}
