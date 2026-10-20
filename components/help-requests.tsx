"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, UserRoundCheck } from "lucide-react";
import { agoLabel, request } from "@/lib/client";
import type { HunchSummary } from "@/lib/types";
import { Pip } from "./hunch";
import { Avatar, ErrorNotice, Spinner } from "./ui";

const first = (name: string) => name.split(" ")[0];

/**
 * Calls for help waiting on you. One request gets the full, friendly strip;
 * several collapse into a compact summary you can open and review one by one.
 */
export function HelpRequests({
  asks,
  onAccepted,
}: {
  asks: HunchSummary[];
  onAccepted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (!asks.length) return null;

  if (asks.length === 1) {
    const [h] = asks;
    return (
      <section className="help-inbox" aria-label="Help request for you">
        <Pip state="found" size={88} />
        <div className="help-inbox-body">
          <strong>{first(h.author.name)} could use your help</strong>
          <span>Hunch sent this request to you.</span>
          <div className="help-inbox-list">
            <Link href={`/hunches/${h.id}`} className="help-inbox-item">
              <Avatar person={h.author} small />
              <span>
                <strong>{h.title}</strong>
                <small>
                  {h.author.jobTitle} · {h.author.team}
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const accept = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await request(`/api/hunches/${id}/accept`, {
        method: "POST",
        body: "{}",
      });
      onAccepted(id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };
  const oldest = asks.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
  return (
    <section
      className="help-inbox help-inbox-compact"
      aria-label="Help requests for you"
    >
      <button
        className="help-summary"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Pip state="found" size={56} />
        <span className="help-summary-text">
          <strong>{asks.length} colleagues are asking for your help</strong>
          <small>Oldest request: {agoLabel(oldest.updatedAt)}</small>
        </span>
        <span className="avatar-stack" aria-hidden="true">
          {asks.map((h) => (
            <Avatar key={h.id} person={h.author} small />
          ))}
        </span>
        <span className="help-summary-toggle">
          {open ? "Hide" : "View"}
          <ChevronDown size={16} />
        </span>
      </button>
      {open && (
        <ul className="help-requests">
          {asks.map((h) => {
            const expanded = reviewing === h.id;
            return (
              <li key={h.id} className={expanded ? "expanded" : undefined}>
                <button
                  className="help-request-head"
                  aria-expanded={expanded}
                  onClick={() => setReviewing(expanded ? null : h.id)}
                >
                  <Avatar person={h.author} small />
                  <span>
                    <strong>{h.title}</strong>
                    <small>
                      {h.author.name} · {h.author.team} ·{" "}
                      {agoLabel(h.updatedAt)}
                    </small>
                  </span>
                  <ChevronDown size={16} />
                </button>
                {expanded && (
                  <div className="help-request-body">
                    <p>{h.workingOn}</p>
                    <div className="help-request-actions">
                      <button
                        className="button primary small"
                        disabled={busy !== null}
                        onClick={() => accept(h.id)}
                      >
                        {busy === h.id ? (
                          <Spinner size={15} />
                        ) : (
                          <UserRoundCheck size={15} />
                        )}
                        I'll take this on
                      </button>
                      <Link
                        href={`/hunches/${h.id}`}
                        className="button secondary small"
                      >
                        View hunch <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <ErrorNotice error={error} />}
    </section>
  );
}
