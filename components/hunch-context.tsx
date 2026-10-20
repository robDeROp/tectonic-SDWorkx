"use client";
import { useState } from "react";
import { ArrowUpRight, Moon } from "lucide-react";
import Link from "next/link";
import { dateLabel } from "@/lib/client";
import type { HunchContextView, HunchSummary } from "@/lib/types";
import { GlyphTile, Relevance, SourceChip } from "./hunch";
import { Avatar, HunchStatus } from "./ui";
import { KnowledgeDetailsModal, type Origin } from "./knowledge/details-modal";
import type { Focus } from "./knowledge/model";

type Tab = "people" | "docs" | "chats";

/**
 * What Hunch linked to this hunch: people, documents and conversations.
 * One list at a time, so the structure stays visible without the noise.
 */
export function HunchContext({
  context,
  hunches,
  origin,
}: {
  context: HunchContextView;
  hunches: HunchSummary[];
  /** The hunch this context belongs to, shown in the details modal. */
  origin?: Origin;
}) {
  const [details, setDetails] = useState<Focus | null>(null);
  /** A row that opens the details modal: graph left, details right. */
  const opens = (focus: Focus, name: string) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": `Details and connections for ${name}`,
    onClick: () => setDetails(focus),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setDetails(focus);
      }
    },
  });
  const hint = (
    <span className="kg-open-hint">
      Details <ArrowUpRight size={13} />
    </span>
  );
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "people", label: "People", count: context.people.length },
    { key: "docs", label: "Documents", count: context.documents.length },
    { key: "chats", label: "Hunches", count: hunches.length },
  ];
  const [tab, setTab] = useState<Tab>(
    tabs.find((t) => t.count)?.key ?? "people",
  );
  return (
    <section className="panel context-panel" aria-label="Relevant context">
      <div className="panel-head">
        <SourceChip kind="summary">Relevant context</SourceChip>
      </div>
      <p className="panel-intro">
        Hunch linked these people, documents and related hunches to this
        question.
      </p>
      <div className="context-tabs" role="tablist">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "context-tab selected" : "context-tab"}
            onClick={() => setTab(key)}
          >
            <GlyphTile kind={key} size={32} />
            <span>
              <strong>{count}</strong>
              {label}
            </span>
          </button>
        ))}
      </div>
      <ul className="context-list" role="tabpanel">
        {tab === "people" &&
          context.people.map((p) => (
            <li
              key={p.id}
              {...opens({ kind: "person", id: p.id }, p.name)}
              className="context-item hn-k-people kg-clickable"
            >
              <Avatar person={p} />
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.jobTitle} · {p.team}
                </span>
                {p.signal && <small>{p.signal}</small>}
              </div>
              <div className="context-meta">
                {p.awayUntil ? (
                  <span className="away-tag">
                    <Moon size={13} /> Away until {dateLabel(p.awayUntil, true)}
                  </span>
                ) : (
                  <span className="available-tag">Available</span>
                )}
                {p.relevance !== undefined && (
                  <Relevance value={p.relevance} label="relevant" />
                )}
                {hint}
              </div>
            </li>
          ))}
        {tab === "docs" &&
          context.documents.map((d) => (
            <li
              key={d.id}
              {...opens({ kind: "item", id: d.id }, d.name)}
              className="context-item hn-k-docs kg-clickable"
            >
              <GlyphTile kind="docs" />
              <div>
                <strong>{d.name}</strong>
                <span>
                  {d.source} · {d.location}
                  {d.owner !== d.location && ` · ${d.owner}`}
                </span>
                <small className="context-reason">{d.reason}</small>
              </div>
              <div className="context-meta">
                <span>Updated {dateLabel(d.updatedAt, true)}</span>
                <Relevance value={d.relevance} label="relevant" />
                {hint}
              </div>
            </li>
          ))}
        {tab === "chats" &&
          hunches.map((c) => (
            <li key={c.id} className="context-item hn-k-chats">
              <GlyphTile kind="chats" />
              <div>
                <Link href={`/hunches/${c.id}`}>
                  <strong>{c.title}</strong>
                </Link>
                <span>
                  {c.author.name} · {dateLabel(c.updatedAt, true)}
                </span>
                <small>{c.workingOn}</small>
              </div>
              <div className="context-meta">
                <HunchStatus status={c.status} />
              </div>
            </li>
          ))}
        {!tabs.find((t) => t.key === tab)?.count && (
          <li className="context-empty">
            Hunch hasn't found anything here for this hunch yet.
          </li>
        )}
      </ul>
      {details && (
        <KnowledgeDetailsModal
          focus={details}
          origin={origin}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  );
}
