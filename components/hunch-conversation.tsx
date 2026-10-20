"use client";
import { useState } from "react";
import { Mail, MessagesSquare, Paperclip, SendHorizontal } from "lucide-react";
import { dateLabel, request, timeLabel } from "@/lib/client";
import type { HunchDetail, HunchMessageView, HunchSource } from "@/lib/types";
import { SourceChip } from "./hunch";
import { Avatar, ErrorNotice, Spinner } from "./ui";

const SOURCE: Record<
  Exclude<HunchSource, "hunch">,
  { label: string; icon: typeof Mail }
> = {
  teams: { label: "Teams", icon: MessagesSquare },
  outlook: { label: "Outlook", icon: Mail },
};

/** Marks anything that did not start in Hunch: icon, name and where. */
export function SourceTag({
  source,
  where,
  compact = false,
}: {
  source: HunchSource;
  where?: string | null;
  /** Icon only, for tight rows; the name stays available as a label. */
  compact?: boolean;
}) {
  if (source === "hunch") return null;
  const { label, icon: Icon } = SOURCE[source];
  return (
    <span
      className={`source-tag source-${source}${compact ? " compact" : ""}`}
      title={compact ? `Geopend vanuit ${label}` : undefined}
      aria-label={compact ? `Geopend vanuit ${label}` : undefined}
    >
      <Icon size={13} />
      {!compact && label}
      {!compact && where && <span className="source-where">· {where}</span>}
    </span>
  );
}

/**
 * The hunch conversation. Messages imported by the Teams or Outlook plugin are
 * set apart and labelled, followed by the moment the hunch was opened.
 */
export function HunchConversation({
  hunch,
  onSent,
}: {
  hunch: HunchDetail;
  onSent: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { messages, source, sourceLabel, author } = hunch;
  // Where the plugin thread ends and the conversation in Hunch begins.
  const imported = messages.findIndex((m) => m.source === "hunch");
  const openedAt = imported === -1 ? messages.length : imported;
  const opener = hunch.viewer.isAuthor ? "Jij" : author.name.split(" ")[0];

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await request(`/api/hunches/${hunch.id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: draft }),
      });
      setDraft("");
      await onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel conversation-panel" aria-label="Gesprek">
      <div className="panel-head">
        <SourceChip kind="chats">Gesprek</SourceChip>
        <span className="panel-meta">
          {messages.length} {messages.length === 1 ? "bericht" : "berichten"}
        </span>
      </div>
      {source !== "hunch" && (
        <div className={`import-banner source-${source}`}>
          <SourceTag source={source} where={sourceLabel} />
          <span>
            {opener} opende deze hunch met de Hunch-plugin. Dit gesprek komt uit{" "}
            {source === "teams" ? "Teams" : "Outlook"}.
          </span>
        </div>
      )}
      <ol className="messages">
        {messages.map((m, i) => (
          <MessageItem
            key={m.id}
            message={m}
            divider={
              source !== "hunch" && i === openedAt && i > 0
                ? `${opener} opende de hunch · ${timeLabel(hunch.createdAt)}`
                : null
            }
          />
        ))}
        {source !== "hunch" && openedAt === messages.length && (
          <li className="message-divider">
            {opener} opende de hunch · {timeLabel(hunch.createdAt)}
          </li>
        )}
      </ol>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) void send();
        }}
      >
        <textarea
          aria-label="Reageer op deze hunch"
          placeholder="Reageer of deel wat je weet…"
          rows={1}
          maxLength={5000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim())
              void send();
          }}
        />
        <button
          className="button primary small"
          disabled={busy || !draft.trim()}
        >
          {busy ? <Spinner size={15} /> : <SendHorizontal size={15} />}
          Versturen
        </button>
      </form>
      {error && <ErrorNotice error={error} />}
    </section>
  );
}

function MessageItem({
  message: m,
  divider,
}: {
  message: HunchMessageView;
  divider: string | null;
}) {
  const external = m.source !== "hunch";
  return (
    <>
      {divider && <li className="message-divider">{divider}</li>}
      <li className={external ? `message from-${m.source}` : "message"}>
        <Avatar person={m.author} small />
        <div className="message-body">
          <div className="message-meta">
            <strong>{m.author.name}</strong>
            {m.external && m.author.jobTitle && (
              <span>{m.author.jobTitle}</span>
            )}
            <time dateTime={m.createdAt}>
              {dateLabel(m.createdAt, true)}, {timeLabel(m.createdAt)}
            </time>
            <SourceTag source={m.source} />
          </div>
          <p>{m.content}</p>
          {m.attachment && (
            <details className="attachment">
              <summary>
                <Paperclip size={15} />
                <strong>{m.attachment.name}</strong>
                <span>
                  {m.attachment.length.toLocaleString("nl-BE")} tekens
                </span>
              </summary>
              <pre>
                {m.attachment.text}
                {m.attachment.length > m.attachment.text.length && "\n…"}
              </pre>
            </details>
          )}
        </div>
      </li>
    </>
  );
}
