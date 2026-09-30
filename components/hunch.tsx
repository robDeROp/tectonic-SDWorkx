/*
 * Hunch design-system primitives, ported from the Hunch component bundle.
 * Presentational only (no hooks), so they work in server and client components.
 * Styles live in app/globals.css under the "Hunch primitives" section.
 */
import type { CSSProperties, ReactNode } from "react";

export type ContextKind = "summary" | "docs" | "chats" | "people";
export type GlyphName = ContextKind | "arrow" | "check" | "close";

/* Category glyphs: 24px grid, 2px round-capped strokes. */
const GLYPHS: Record<GlyphName, string> = {
  summary: "M12 3 Q12 12 21 12 Q12 12 12 21 Q12 12 3 12 Q12 12 12 3 Z",
  docs: "M7 3 H14 L19 8 V20 A1 1 0 0 1 18 21 H7 A1 1 0 0 1 6 20 V4 A1 1 0 0 1 7 3 Z M14 3 V8 H19 M9 13 H16 M9 17 H14",
  chats:
    "M5 5 H19 A2 2 0 0 1 21 7 V15 A2 2 0 0 1 19 17 H11 L7 20 V17 H5 A2 2 0 0 1 3 15 V7 A2 2 0 0 1 5 5 Z M8 11 H8.01 M12 11 H12.01 M16 11 H16.01",
  people:
    "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 Z M3 20 C3 16 5.5 14 9 14 C12.5 14 15 16 15 20 M16 4.5 A3 3 0 0 1 16 10.5 M18 14.5 C20 15.3 21 17.2 21 20",
  arrow: "M5 12 H19 M13 6 L19 12 L13 18",
  check: "M5 12.5 L10 17 L19 7",
  close: "M6 6 L18 18 M18 6 L6 18",
};

export function HunchIcon({
  name,
  size = 20,
  className,
}: {
  name: GlyphName;
  size?: number;
  className?: string;
}) {
  const filled = name === "summary";
  return (
    <svg
      className={className ? `hn-icon ${className}` : "hn-icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={GLYPHS[name]} />
    </svg>
  );
}

/* The four-point spark: the logo star, Pip's antenna and the summary glyph. */
const star = (x: number, y: number, s: number) =>
  `M${x},${y - s} Q${x},${y} ${x + s},${y} Q${x},${y} ${x},${y + s} Q${x},${y} ${x - s},${y} Q${x},${y} ${x},${y - s} Z`;

/* Fixed brand colours for the mark and Pip (never recoloured). */
const BRAND = {
  coral: "#FF7A50",
  ink: "#12343B",
  sunflower: "#FFC53D",
  cream: "#FFF8EF",
  blush: "#FFB59A",
  lens: "#D7F1EC",
};

/** The Hunch mark: a coral ticket with a face and the spark arriving. */
export function HunchMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        d="M16,14 H48 A10,10 0 0 1 58,24 V29 A5,5 0 0 0 58,39 V44 A10,10 0 0 1 48,54 H16 A10,10 0 0 1 6,44 V39 A5,5 0 0 0 6,29 V24 A10,10 0 0 1 16,14 Z"
        fill={BRAND.coral}
      />
      <rect x={27} y={27} width={6} height={13} rx={3} fill={BRAND.ink} />
      <rect x={38} y={27} width={6} height={13} rx={3} fill={BRAND.ink} />
      <path d={star(52, 11, 9)} fill={BRAND.sunflower} />
    </svg>
  );
}

/**
 * Mark + lowercase wordmark. The wordmark inherits its colour, so it is ink on
 * light grounds and on-header on the dark header (the reverse lockup).
 */
export function HunchLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className ? `hn-logo ${className}` : "hn-logo"}
      style={{ "--logo-size": `${size}px` } as CSSProperties}
    >
      <HunchMark size={size} />
      <span className="hn-wordmark">hunch</span>
    </span>
  );
}

export type PipState = "working" | "found" | "idle";

const PIP_BODY =
  "M62,67 H138 A22,22 0 0 1 160,89 V105 A10,10 0 0 0 160,125 V141 A22,22 0 0 1 138,163 H62 A22,22 0 0 1 40,141 V125 A10,10 0 0 0 40,105 V89 A22,22 0 0 1 62,67 Z";

/** Pip, the mascot, drawn live so its lines follow the theme's ink. */
export function Pip({
  state = "idle",
  size = 96,
  label,
  className,
}: {
  state?: PipState;
  size?: number;
  label?: string;
  className?: string;
}) {
  const found = state === "found";
  const working = state === "working";
  const line = {
    className: "pip-line",
    fill: "none",
    strokeLinecap: "round" as const,
  };
  return (
    <svg
      className={`hn-pip hn-pip-${state}${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={
        label ||
        (working
          ? "Pip zoekt context"
          : found
            ? "Pip heeft context gevonden"
            : "Pip")
      }
    >
      <ellipse className="pip-shadow" cx={100} cy={182} rx={46} ry={6} />
      <g className="pip-bob">
        <path d="M100,67 C100,54 106,46 111,38" strokeWidth={4} {...line} />
        <path
          className="pip-spark"
          d={star(113, 31, found ? 12 : 9)}
          fill={BRAND.sunflower}
        />
        {found && (
          <path
            d={`${star(140, 28, 5)} ${star(84, 34, 4)}`}
            fill={BRAND.sunflower}
          />
        )}
        <ellipse className="pip-fill-line" cx={80} cy={166} rx={10} ry={6} />
        <ellipse className="pip-fill-line" cx={120} cy={166} rx={10} ry={6} />
        <path
          strokeWidth={5}
          d={
            found
              ? "M44,112 L26,92 M156,112 L174,92"
              : working
                ? "M42,126 L28,136"
                : "M42,128 L30,140 M158,128 L170,140"
          }
          {...line}
        />
        <path d={PIP_BODY} fill={BRAND.coral} />
        <path
          d="M58,151 H142"
          stroke={BRAND.cream}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1 9"
          opacity={0.9}
        />
        {found ? (
          <g>
            <path
              d="M72,110 Q82,98 92,110 M108,110 Q118,98 128,110"
              fill="none"
              stroke={BRAND.ink}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path d="M88,126 Q100,140 112,126 Z" fill={BRAND.ink} />
          </g>
        ) : (
          <g>
            <g className="pip-eyes">
              <ellipse cx={82} cy={108} rx={13} ry={14} fill={BRAND.cream} />
              <ellipse cx={118} cy={108} rx={13} ry={14} fill={BRAND.cream} />
              <g className="pip-look">
                <circle
                  cx={working ? 86 : 83}
                  cy={110}
                  r={6.5}
                  fill={BRAND.ink}
                />
                <circle
                  cx={working ? 122 : 119}
                  cy={110}
                  r={6.5}
                  fill={BRAND.ink}
                />
                <circle
                  cx={working ? 88 : 85}
                  cy={107}
                  r={2}
                  fill={BRAND.cream}
                />
                <circle
                  cx={working ? 124 : 121}
                  cy={107}
                  r={2}
                  fill={BRAND.cream}
                />
              </g>
            </g>
            <path
              d={
                working
                  ? "M94,131 Q100,135 106,131"
                  : "M91,129 Q100,137 109,129"
              }
              fill="none"
              stroke={BRAND.ink}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
        )}
        <circle cx={68} cy={127} r={6} fill={BRAND.blush} />
        <circle cx={132} cy={127} r={6} fill={BRAND.blush} />
        {working && (
          <g className="pip-lens">
            <path
              d="M158,122 L167,114"
              stroke={BRAND.ink}
              strokeWidth={5}
              strokeLinecap="round"
              className="pip-line"
            />
            <path
              d="M166,115 L172,108"
              strokeWidth={8}
              strokeLinecap="round"
              className="pip-line"
            />
            <circle
              cx={182}
              cy={97}
              r={14}
              fill={BRAND.lens}
              fillOpacity={0.85}
              strokeWidth={5}
              className="pip-line"
            />
            <path
              d="M175,92 Q179,88 184,88"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Pip popping up with a speech bubble. A polite live region, so screen readers
 * hear each real step as it happens.
 */
export function PipToast({
  state,
  message,
  leaving = false,
  size = 80,
}: {
  state: "working" | "found";
  message: string;
  leaving?: boolean;
  size?: number;
}) {
  return (
    <div
      className="hn-toast"
      role="status"
      aria-live="polite"
      data-leaving={leaving ? "true" : "false"}
    >
      <div className="hn-bubble">
        <strong>{state === "found" ? "Alles klaar" : "Mee bezig"}</strong>
        <span className="hn-bubble-msg" key={message}>
          {message}
          {state === "working" && (
            <span className="hn-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </span>
      </div>
      <Pip state={state} size={size} />
    </div>
  );
}

const KIND_LABEL: Record<ContextKind, string> = {
  summary: "Samenvatting",
  docs: "Documenten",
  chats: "Chats & e-mail",
  people: "Mensen",
};

/** Uppercase label naming a context type with its colour and glyph. */
export function SourceChip({
  kind,
  children,
  className,
}: {
  kind: ContextKind;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`hn-chip hn-k-${kind}${className ? ` ${className}` : ""}`}>
      <HunchIcon name={kind} size={14} />
      {children ?? KIND_LABEL[kind]}
    </span>
  );
}

/** Soft tile holding a category glyph (ContextCard / section headers). */
export function GlyphTile({
  kind,
  size = 36,
}: {
  kind: ContextKind;
  size?: number;
}) {
  return (
    <span
      className={`hn-glyph hn-k-${kind}`}
      style={{ "--tile": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <HunchIcon name={kind} size={Math.round(size * 0.55)} />
    </span>
  );
}

/** Confidence bar: always shows the number, never colour alone. */
export function Relevance({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <span className="hn-rel">
      <span className="hn-rel-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
      <span>
        {pct}% {label}
      </span>
    </span>
  );
}
