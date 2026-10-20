"use client";
import type { Freshness, GraphPerson } from "@/lib/types";
import { COL, GLYPH, type NodeKind } from "./model";

export function Glyph({
  kind,
  color,
  size = 16,
}: {
  kind: NodeKind;
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={GLYPH[kind]} />
    </svg>
  );
}
/** Large icon tile in the details header. */
export function Tile({ kind, size = 48 }: { kind: NodeKind; size?: number }) {
  return (
    <span
      className="kg-tile"
      style={{ width: size, height: size, background: COL[kind].soft }}
    >
      <Glyph
        kind={kind}
        color={COL[kind].strong}
        size={Math.round(size * 0.5)}
      />
    </span>
  );
}
/** Small icon or initials in front of a list row. */
export function Mini({
  kind,
  initials,
}: {
  kind: NodeKind;
  initials?: string;
}) {
  if (kind === "person")
    return (
      <span
        className="kg-mini kg-round"
        style={{ background: COL.person.soft, color: COL.person.strong }}
      >
        {initials}
      </span>
    );
  return (
    <span className="kg-mini" style={{ background: COL[kind].soft }}>
      <Glyph kind={kind} color={COL[kind].strong} size={15} />
    </span>
  );
}
export const PersonMini = ({ p }: { p: GraphPerson }) => (
  <Mini kind="person" initials={p.initials} />
);
export function FreshPill({ fresh }: { fresh: Freshness }) {
  return <span className={`kg-pill kg-${fresh.k}`}>{fresh.label}</span>;
}
export function Dot({ color }: { color: string }) {
  return <span className="kg-dot" style={{ background: color }} />;
}
export function ZoomControls({
  onZoom,
  fitLabel = "Fit to view",
}: {
  onZoom: (z: "in" | "out" | "fit") => void;
  fitLabel?: string;
}) {
  return (
    <div className="kg-zoom">
      <button type="button" aria-label="Zoom in" onClick={() => onZoom("in")}>
        +
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => onZoom("out")}>
        −
      </button>
      <button
        type="button"
        className="kg-fit"
        aria-label={fitLabel}
        onClick={() => onZoom("fit")}
      >
        FIT
      </button>
    </div>
  );
}
