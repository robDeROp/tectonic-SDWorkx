"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  COL,
  GLYPH,
  GROUP_ORDER,
  linked,
  trunc,
  wrapLines,
  type Ego,
  type EgoNode,
  type Model,
  type NodeKind,
} from "./model";
import { ZoomControls } from "./bits";

type Edge = { key: string; a: EgoNode; b: EgoNode };
type State = {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  gE1: d3.Selection<SVGGElement, unknown, null, undefined>;
  gE2: d3.Selection<SVGGElement, unknown, null, undefined>;
  gN: d3.Selection<SVGGElement, unknown, null, undefined>;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  pos: Map<string, { x: number; y: number }>;
  adj: Map<string, Set<string>>;
  w: number;
  h: number;
  R: number;
  center: string;
};

/** Places the ring around the centre, one arc per kind, alternating radii when crowded. */
function layoutEgo(ring: EgoNode[]) {
  const groups = GROUP_ORDER.map((g) =>
    ring.filter((n) => n.group === g),
  ).filter((a) => a.length);
  const total = ring.length;
  if (!total) return 0;
  const gap = groups.length > 1 ? 0.2 : 0;
  const avail = Math.PI * 2 - gap * groups.length;
  const R = Math.max(230, (total * 132) / (Math.PI * 2));
  let a = -Math.PI / 2 - (avail * (groups[0].length / total)) / 2;
  for (const grp of groups) {
    const span = avail * (grp.length / total);
    const step = span / grp.length;
    const crowded = step * R < 160;
    grp.forEach((n, i) => {
      const ang = a + step * (i + 0.5);
      const r = crowded && i % 2 ? R * 0.66 : R;
      n.x = Math.cos(ang) * r;
      n.y = Math.sin(ang) * r;
    });
    a += span + gap;
  }
  return R;
}

/**
 * The "Verbanden" graph: one item or person in the middle, everything it is
 * connected to around it, grouped by kind. Dashed curves show ring nodes that
 * are also connected to each other.
 */
export function EgoGraph({
  model,
  ego,
  hidden,
  hover,
  onHover,
  onPick,
}: {
  model: Model;
  ego: Ego;
  hidden: Set<NodeKind>;
  hover: string | null;
  onHover: (key: string | null) => void;
  onPick: (n: EgoNode) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const S = useRef<State | null>(null);
  const cb = useRef({ onHover, onPick });
  useEffect(() => {
    cb.current = { onHover, onPick };
  });

  const fit = (animate: boolean) => {
    const s = S.current;
    if (!s) return;
    const R = s.R + 120;
    const k = Math.max(
      0.3,
      Math.min(1.15, Math.min(s.w / (2 * R), s.h / (2 * R + 40))),
    );
    const t = d3.zoomIdentity.translate(s.w / 2, s.h / 2 - 10 * k).scale(k);
    if (animate) s.svg.transition().duration(650).call(s.zoom.transform, t);
    else s.svg.call(s.zoom.transform, t);
  };

  useEffect(() => {
    const el = stage.current!;
    const svg = d3
      .select(el)
      .insert("svg", ":first-child")
      .attr("role", "img")
      .attr("aria-label", "Connection graph") as d3.Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >;
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .extent(() => {
        const b = el.getBoundingClientRect();
        return [
          [0, 0],
          [b.width || 1, b.height || 1],
        ];
      })
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(zoom).on("dblclick.zoom", null);
    const r = el.getBoundingClientRect();
    S.current = {
      svg,
      g,
      gE2: g.append("g"),
      gE1: g.append("g"),
      gN: g.append("g"),
      zoom,
      pos: new Map(),
      adj: new Map(),
      w: r.width,
      h: r.height,
      R: 200,
      center: "",
    };
    const ro = new ResizeObserver(() => {
      const b = el.getBoundingClientRect();
      const s = S.current!;
      if (
        b.width &&
        (Math.abs(b.width - s.w) > 4 || Math.abs(b.height - s.h) > 4)
      ) {
        s.w = b.width;
        s.h = b.height;
        fit(false);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      svg.remove();
      S.current = null;
    };
  }, []);

  useEffect(() => {
    const s = S.current;
    if (!s) return;
    const center: EgoNode = { ...ego.center, x: 0, y: 0 };
    const ring = ego.ring
      .filter((n) => !hidden.has(n.group))
      .map((n) => ({ ...n }));
    s.R = layoutEgo(ring) || 200;
    s.center = center.key;
    const nodes = [center, ...ring];
    const sec: Edge[] = [];
    for (let i = 0; i < ring.length; i++)
      for (let j = i + 1; j < ring.length; j++)
        if (linked(model, ring[i], ring[j]))
          sec.push({
            key: ring[i].key + "|" + ring[j].key,
            a: ring[i],
            b: ring[j],
          });
    s.adj = new Map(nodes.map((n) => [n.key, new Set([center.key])]));
    sec.forEach((e) => {
      s.adj.get(e.a.key)!.add(e.b.key);
      s.adj.get(e.b.key)!.add(e.a.key);
    });
    ring.forEach((n) => s.adj.get(center.key)!.add(n.key));
    const prev = s.pos;
    const T = d3.transition().duration(650).ease(d3.easeCubicOut);
    const from = (n: EgoNode) => prev.get(n.key) ?? { x: 0, y: 0 };

    s.gE1
      .selectAll<SVGLineElement, EgoNode>("line")
      .data(ring, (d) => d.key)
      .join(
        (en) =>
          en
            .append("line")
            .attr("class", "kg-e1")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d) => from(d).x)
            .attr("y2", (d) => from(d).y)
            .attr("opacity", 0),
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      )
      .transition(T)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d) => d.x!)
      .attr("y2", (d) => d.y!)
      .attr("opacity", 1);

    const curve = (a: EgoNode, b: EgoNode) =>
      `M${a.x},${a.y} Q${(a.x! + b.x!) * 0.3},${(a.y! + b.y!) * 0.3} ${b.x},${b.y}`;
    s.gE2
      .selectAll<SVGPathElement, Edge>("path")
      .data(sec, (d) => d.key)
      .join(
        (en) =>
          en
            .append("path")
            .attr("class", "kg-e2")
            .attr("opacity", 0)
            .attr("d", (d) => curve(d.a, d.b)),
        (up) => up,
        (ex) => ex.transition(T).attr("opacity", 0).remove(),
      )
      .transition(T)
      .attr("d", (d) => curve(d.a, d.b))
      .attr("opacity", 1);

    const sel = s.gN
      .selectAll<SVGGElement, EgoNode>("g.kg-gnode")
      .data(nodes, (d) => d.key)
      .join(
        (en) => {
          const g = en
            .append("g")
            .attr("class", "kg-gnode")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr(
              "transform",
              (d) => `translate(${from(d).x},${from(d).y}) scale(.4)`,
            )
            .attr("opacity", 0);
          g.append("circle")
            .attr("class", "kg-halo")
            .attr("r", 0)
            .attr("fill", "#FFF1C9");
          const body = g.append("g").attr("class", "kg-body");
          body.each(function (d) {
            const b = d3.select(this);
            const c = COL[d.kind];
            if (d.kind === "person") {
              b.append("circle")
                .attr("r", 22)
                .attr("fill", c.soft)
                .attr("stroke", c.c)
                .attr("stroke-width", 1.6);
              b.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "0.36em")
                .attr("fill", c.strong)
                .attr("class", "kg-initials")
                .text(d.initials ?? "");
            } else {
              b.append("rect")
                .attr("x", -22)
                .attr("y", -22)
                .attr("width", 44)
                .attr("height", 44)
                .attr("rx", d.kind === "unit" ? 10 : 13)
                .attr("fill", c.soft)
                .attr("stroke", c.c)
                .attr("stroke-width", 1.6)
                .attr("stroke-dasharray", d.kind === "unit" ? "4 3" : null);
              b.append("path")
                .attr("d", GLYPH[d.kind])
                .attr("transform", "translate(-12,-12)")
                .attr("fill", "none")
                .attr("stroke", c.strong)
                .attr("stroke-width", 2)
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round");
            }
          });
          g.append("g").attr("class", "kg-texts");
          g.append("title");
          g.on("click", (_e, d) => cb.current.onPick(d))
            .on("keydown", (e: KeyboardEvent, d) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cb.current.onPick(d);
              }
            })
            .on("mouseenter focus", (_e, d) => cb.current.onHover(d.key))
            .on("mouseleave blur", () => cb.current.onHover(null));
          return g;
        },
        (up) => up,
        (ex) =>
          ex
            .transition(T)
            .attr("opacity", 0)
            .attr(
              "transform",
              (d) => `translate(${d.x ?? 0},${d.y ?? 0}) scale(.3)`,
            )
            .remove(),
      );
    sel.each(function (d) {
      const g = d3.select(this);
      const isC = d.key === center.key;
      g.classed("kg-center", isC);
      g.select("title").text(
        isC
          ? d.label
          : `${d.label} (${d.rel})${d.kind === "unit" ? " · opens in the organisation chart" : ""}`,
      );
      g.select(".kg-halo")
        .transition(T)
        .attr("r", isC ? 46 : 0);
      g.select(".kg-body")
        .transition(T)
        .attr("transform", `scale(${isC ? 1.55 : 1})`);
      const tx = g.select(".kg-texts");
      tx.selectAll("*").remove();
      if (isC) {
        const lines = wrapLines(d.label, 30, 2);
        lines.forEach((l, i) =>
          tx
            .append("text")
            .attr("class", "kg-lbl kg-lbl-center")
            .attr("text-anchor", "middle")
            .attr("y", 66 + i * 19)
            .text(l),
        );
        tx.append("text")
          .attr("class", "kg-rel")
          .attr("text-anchor", "middle")
          .attr("y", 66 + lines.length * 19)
          .text(d.rel);
      } else {
        tx.append("text")
          .attr("class", "kg-lbl")
          .attr("text-anchor", "middle")
          .attr("y", 40)
          .text(trunc(d.label, 24));
        tx.append("text")
          .attr("class", "kg-rel")
          .attr("text-anchor", "middle")
          .attr("y", 55)
          .text(d.rel);
      }
    });
    sel
      .transition(T)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("opacity", 1);
    s.pos = new Map(nodes.map((n) => [n.key, { x: n.x!, y: n.y! }]));
    fit(true);
  }, [model, ego, hidden]);

  useEffect(() => {
    const s = S.current;
    if (!s) return;
    const key = hover;
    const on = key && key !== s.center ? s.adj.get(key) : null;
    s.gN
      .selectAll<SVGGElement, EgoNode>("g.kg-gnode")
      .classed("kg-dim", (d) => !!on && d.key !== key && !on.has(d.key))
      .classed("kg-hi", (d) => d.key === key);
    s.gE1
      .selectAll<SVGLineElement, EgoNode>("line")
      .classed("kg-hi", (d) => d.key === key)
      .classed("kg-edim", (d) => !!on && d.key !== key);
    s.gE2
      .selectAll<SVGPathElement, Edge>("path")
      .classed("kg-hi", (d) => !!on && (d.a.key === key || d.b.key === key))
      .classed("kg-edim", (d) => !!on && d.a.key !== key && d.b.key !== key);
  }, [hover, ego, hidden]);

  return (
    <div className="kg-canvas kg-dotgrid" ref={stage}>
      <div className="kg-legend-note">
        Click a node to explore further · dotted line = connected to each other
      </div>
      <ZoomControls
        onZoom={(z) => {
          const s = S.current;
          if (!s) return;
          if (z === "fit") fit(true);
          else
            s.svg
              .transition()
              .duration(250)
              .call(s.zoom.scaleBy, z === "in" ? 1.3 : 1 / 1.3);
        }}
      />
    </div>
  );
}
