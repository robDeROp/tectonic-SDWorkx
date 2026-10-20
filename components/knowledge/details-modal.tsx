"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ErrorNotice, Spinner } from "../ui";
import {
  COL,
  GROUP_LABEL,
  GROUP_ORDER,
  egoOf,
  trunc,
  type Focus,
  type Go,
  type Model,
  type NodeKind,
} from "./model";
import { Dot, Tile } from "./bits";
import { EgoGraph } from "./ego-graph";
import { Connections, ItemDetails, PersonDetails, goFor } from "./details";
import { useKnowledge } from "./use-knowledge";

export type Origin = { eyebrow: string; title: string; kind?: NodeKind };

/** Where a jump to another view leads, as a URL. */
export function hrefFor(g: Go): string | null {
  if (g.to === "org")
    return `/organigram?${g.kind}=${encodeURIComponent(g.id)}`;
  if (g.to === "map") return `/kennisbank?item=${encodeURIComponent(g.id)}`;
  if (g.to === "topic") return `/kennisbank?topic=${encodeURIComponent(g.id)}`;
  if (g.to === "href") return g.href;
  return null;
}

const label = (m: Model, f: Focus) =>
  (f.kind === "person" ? m.person(f.id)?.name : m.item(f.id)?.title) ??
  "Onbekend";

/**
 * Graph on the left, details on the right. Clicking a node or a row jumps to
 * it; the trail keeps the way back.
 */
function Explorer({
  model,
  start,
  origin,
  onGo,
  onClose,
}: {
  model: Model;
  start: Focus;
  origin?: Origin;
  onGo: (g: Go) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(start);
  const [history, setHistory] = useState<Focus[]>([]);
  const [hidden, setHidden] = useState<Set<NodeKind>>(() => new Set());
  const [hover, setHover] = useState<string | null>(null);
  const ego = useMemo(() => egoOf(model, current), [model, current]);
  const inspector = useRef<HTMLElement>(null);
  useEffect(() => {
    inspector.current?.scrollTo({ top: 0 });
    setHover(null);
  }, [current]);

  const focus = (f: Focus) => {
    if (f.kind === current.kind && f.id === current.id) return;
    setHistory((h) => [...h, current]);
    setCurrent(f);
  };
  const back = (i: number) => {
    setCurrent(history[i]);
    setHistory((h) => h.slice(0, i));
  };
  const go = (g: Go) => (g.to === "graph" ? focus(g.focus) : onGo(g));

  if (!ego)
    return (
      <div className="kg-modal-empty">
        <p>Voor dit item zijn nog geen details in de kennisgraaf.</p>
        <button type="button" className="kg-btn" onClick={onClose}>
          Sluiten
        </button>
      </div>
    );
  const counts: Partial<Record<NodeKind, number>> = {};
  ego.ring.forEach((n) => (counts[n.group] = (counts[n.group] ?? 0) + 1));
  Object.entries(ego.over).forEach(
    ([g, n]) =>
      (counts[g as NodeKind] = (counts[g as NodeKind] ?? 0) + (n ?? 0)),
  );
  const shown = history.slice(-3);
  const skipped = history.length - shown.length;
  const atStart = current.kind === start.kind && current.id === start.id;
  const it = current.kind === "item" ? model.item(current.id) : undefined;
  const p = current.kind === "person" ? model.person(current.id) : undefined;

  return (
    <div className="kg-modal-grid">
      <section className="kg-stage">
        <div className="kg-stage-bar">
          {origin && (
            <div className="kg-context">
              <Tile kind={origin.kind ?? "hunch"} size={38} />
              <div className="kg-ctx-text">
                <span>{origin.eyebrow}</span>
                <b>{origin.title}</b>
              </div>
            </div>
          )}
          <div className="kg-chips" aria-label="Toon of verberg soorten">
            {GROUP_ORDER.filter((g) => counts[g]).map((g) => (
              <button
                key={g}
                type="button"
                className="kg-chip"
                aria-pressed={!hidden.has(g)}
                onClick={() =>
                  setHidden((h) => {
                    const next = new Set(h);
                    if (next.has(g)) next.delete(g);
                    else next.add(g);
                    return next;
                  })
                }
              >
                <Dot color={COL[g].c} />
                {GROUP_LABEL[g]}
                <span className="kg-n">{counts[g]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="kg-trail">
          {history.length > 0 && (
            <button
              type="button"
              className="kg-back"
              onClick={() => back(history.length - 1)}
            >
              ← Terug
            </button>
          )}
          {skipped > 0 && (
            <>
              <span className="kg-sep">…</span>
              <span className="kg-sep">›</span>
            </>
          )}
          {shown.map((f, i) => (
            <span key={`${f.id}-${i}`} className="kg-trail-step">
              <button type="button" onClick={() => back(skipped + i)}>
                {trunc(label(model, f), 30)}
              </button>
              <span className="kg-sep">›</span>
            </span>
          ))}
          {!history.length && (
            <span className="kg-sep kg-muted">Je bekijkt</span>
          )}
          <span className="kg-cur">{trunc(label(model, current), 44)}</span>
          {!atStart && (
            <button
              type="button"
              className="kg-home"
              onClick={() => {
                setHistory([]);
                setCurrent(start);
              }}
            >
              Terug naar het startpunt
            </button>
          )}
        </div>
        <EgoGraph
          model={model}
          ego={ego}
          hidden={hidden}
          hover={hover}
          onHover={setHover}
          onPick={(n) => {
            if (n.key !== ego.center.key) go(goFor(n));
          }}
        />
      </section>
      <aside className="kg-inspector" ref={inspector} aria-live="polite">
        <button
          type="button"
          className="kg-close"
          aria-label="Sluiten"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        {it && <ItemDetails model={model} it={it} onGo={go} place="graph" />}
        {p && <PersonDetails model={model} p={p} onGo={go} place="graph" />}
        <Connections ego={ego} onGo={go} hover={hover} onHover={setHover} />
      </aside>
    </div>
  );
}

/**
 * The details of a person or knowledge item, as a modal: the connection graph
 * on the left and the details on the right. Jumps to the kennisbank or the
 * organigram navigate there; `onNavigate` lets the host handle a jump itself.
 */
export function KnowledgeDetailsModal({
  focus,
  origin,
  onClose,
  onNavigate,
}: {
  focus: Focus;
  origin?: Origin;
  onClose: () => void;
  onNavigate?: (g: Go) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { model, error, retry } = useKnowledge();
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const onGo = (g: Go) => {
    if (onNavigate?.(g)) return;
    const href = hrefFor(g);
    if (href) router.push(href);
  };
  return (
    <dialog
      ref={dialog}
      className="kg-modal"
      aria-label="Details en verbanden"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {model ? (
        <Explorer
          model={model}
          start={focus}
          origin={origin}
          onGo={onGo}
          onClose={onClose}
        />
      ) : (
        <div className="kg-modal-empty">
          {error ? (
            <ErrorNotice error={error} onRetry={retry} />
          ) : (
            <>
              <Spinner /> Kennisgraaf laden…
            </>
          )}
          <button
            type="button"
            className="kg-close kg-close-static"
            aria-label="Sluiten"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </dialog>
  );
}
