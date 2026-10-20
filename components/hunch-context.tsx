"use client";
import { useState } from "react";
import { Moon } from "lucide-react";
import { dateLabel } from "@/lib/client";
import type { HunchContextView } from "@/lib/types";
import { GlyphTile, Relevance, SourceChip } from "./hunch";
import { Avatar } from "./ui";

type Tab = "people" | "docs" | "chats";

/**
 * What Hunch linked to this hunch: people, documents and conversations.
 * One list at a time, so the structure stays visible without the noise.
 */
export function HunchContext({ context }: { context: HunchContextView }) {
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "people", label: "Mensen", count: context.people.length },
    { key: "docs", label: "Documenten", count: context.documents.length },
    { key: "chats", label: "Gesprekken", count: context.conversations.length },
  ];
  const [tab, setTab] = useState<Tab>(
    tabs.find((t) => t.count)?.key ?? "people",
  );
  return (
    <section className="panel context-panel" aria-label="Relevante context">
      <div className="panel-head">
        <SourceChip kind="summary">Relevante context</SourceChip>
      </div>
      <p className="panel-intro">
        Hunch koppelde deze mensen, documenten en gesprekken aan deze hunch.
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
            <li key={p.id} className="context-item hn-k-people">
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
                    <Moon size={13} /> Afwezig tot{" "}
                    {dateLabel(p.awayUntil, true)}
                  </span>
                ) : (
                  <span className="available-tag">Beschikbaar</span>
                )}
                {p.relevance !== undefined && (
                  <Relevance value={p.relevance} label="relevant" />
                )}
              </div>
            </li>
          ))}
        {tab === "docs" &&
          context.documents.map((d) => (
            <li key={d.id} className="context-item hn-k-docs">
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
                <span>Bijgewerkt {dateLabel(d.updatedAt, true)}</span>
                <Relevance value={d.relevance} label="relevant" />
              </div>
            </li>
          ))}
        {tab === "chats" &&
          context.conversations.map((c) => (
            <li key={c.id} className="context-item hn-k-chats">
              <GlyphTile kind="chats" />
              <div>
                <strong>{c.title}</strong>
                <span>
                  {c.channel} · {c.location} · {dateLabel(c.lastActivity, true)}
                </span>
                <small>“{c.snippet}”</small>
              </div>
              <div className="context-meta">
                <span className="avatar-stack">
                  {c.participants.map((p) => (
                    <Avatar key={p.id} person={p} small />
                  ))}
                </span>
                <Relevance value={c.relevance} label="relevant" />
              </div>
            </li>
          ))}
        {!tabs.find((t) => t.key === tab)?.count && (
          <li className="context-empty">
            Hunch vond hier nog niets voor deze hunch.
          </li>
        )}
      </ul>
    </section>
  );
}
