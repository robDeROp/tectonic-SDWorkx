"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Upload,
  TriangleAlert,
} from "lucide-react";
import { dateLabel, request, timeLabel } from "@/lib/client";
import { colleagueEmail } from "@/lib/fixtures";
import {
  sourceKinds,
  type DocumentView,
  type DraftResult,
  type JobView,
  type ReviewResult,
  type TicketDetail,
} from "@/lib/types";
import {
  GlyphTile,
  HunchIcon,
  HunchMark,
  Relevance,
  SourceChip,
} from "./hunch";
import { PipStatus } from "./pip-status";
import { ErrorNotice, Modal, Spinner, Status } from "./ui";

export function TicketWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<TicketDetail | null>(null);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [version, setVersion] = useState(0);
  const dirty = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [upload, setUpload] = useState(false);
  const [selected, setSelected] = useState<DocumentView | null>(null);
  const [confirm, setConfirm] = useState<
    "reset" | "override" | "draft" | "colleague-email" | null
  >(null);
  const [composer, setComposer] = useState<"answer" | "note">("answer");
  const [note, setNote] = useState("");
  const noteId = useRef<string | null>(null);
  const actionsMenu = useRef<HTMLDetailsElement>(null);
  function openAction(action: "colleague-email" | "reset") {
    if (actionsMenu.current) actionsMenu.current.open = false;
    setError("");
    setConfirm(action);
  }
  const load = useCallback(async () => {
    try {
      const next = await request<TicketDetail>(`/api/tickets/${id}`);
      setData(next);
      if (!dirty.current) {
        setAnswer(next.ticket.answer);
        setVersion(next.ticket.answerVersion);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    let alive = true;
    void request(`/api/tickets/${id}/start`, { method: "POST" })
      .then(() => {
        if (alive) void load();
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          void load();
        }
      });
    const timer = setInterval(() => void load(), 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id, load]);
  async function save() {
    if (!dirty.current) return version;
    const result = await request<{ answerVersion: number }>(
      `/api/tickets/${id}/answer`,
      {
        method: "POST",
        body: JSON.stringify({ answer, version }),
      },
    );
    dirty.current = false;
    setIsDirty(false);
    setVersion(result.answerVersion);
    return result.answerVersion;
  }
  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      if (action === "save") await save();
      else {
        let current = version;
        if (action === "draft" || action === "review") current = await save();
        if ((action === "send" || action === "override") && dirty.current)
          throw new Error(
            "Your answer has changed. Have the new version checked first.",
          );
        if (action === "message") {
          noteId.current ??= crypto.randomUUID();
          payload = { content: note, messageId: noteId.current };
        }
        await request(`/api/tickets/${id}/${action}`, {
          method: "POST",
          body: JSON.stringify({ version: current, ...payload }),
        });
        if (action === "reset") {
          dirty.current = false;
          setIsDirty(false);
          setNote("");
        }
        if (action === "message") {
          setNote("");
          noteId.current = null;
        }
      }
      await load();
      setConfirm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!data)
    return (
      <div className="page">
        {error ? (
          <ErrorNotice error={error} onRetry={load} />
        ) : (
          <div className="loading-page">
            <Spinner size={25} />
            <p>Opening your ticket…</p>
          </div>
        )}
      </div>
    );
  const { ticket, documents, jobs, messages, deliveries, ai } = data;
  const active = jobs.find((j) => ["queued", "running"].includes(j.state));
  const running = jobs.find((j) => j.state === "running");
  const pipStep = !running
    ? null
    : running.kind === "documents"
      ? data.events.some(
          (e) => e.jobId === running.id && e.label === "Assessing reliability",
        )
        ? "Assessing reliability"
        : "Searching the knowledge base"
      : running.kind === "draft"
        ? "Writing a draft"
        : "Check answer";
  const emails = messages.filter((m) => m.kind === "email");
  const documentsReady =
    documents.length > 0 &&
    documents.every((d) => d.assessedVersion === ticket.documentVersion);
  const current = (j: JobView) =>
    j.generation === ticket.generation &&
    j.documentVersion === ticket.documentVersion &&
    j.contextVersion === ticket.contextVersion &&
    j.answerVersion === ticket.answerVersion;
  const latestReview = jobs.find(
    (j) => j.kind === "review" && j.state === "done" && current(j),
  );
  const review = latestReview?.result as ReviewResult | undefined;
  const alreadySent =
    !!latestReview && deliveries.some((d) => d.reviewId === latestReview.id);
  const reviewValid = !!review && !isDirty && !active;
  const editorLocked = !!busy || (!!active && active.kind !== "documents");
  const receivedEmail = messages.some((m) => m.kind === "email");
  const draft = jobs.find(
    (j) =>
      j.kind === "draft" &&
      j.state === "done" &&
      j.generation === ticket.generation &&
      j.documentVersion === ticket.documentVersion &&
      j.contextVersion === ticket.contextVersion &&
      j.answerVersion + 1 === ticket.answerVersion,
  )?.result as DraftResult | undefined;
  type Entry = { key: string; at: string; rank: number } & (
    | {
        kind: "job";
        job: JobView;
        stage: "search" | "assess" | "draft" | "review";
      }
    | { kind: "message"; message: TicketDetail["messages"][number] }
    | { kind: "delivery"; delivery: TicketDetail["deliveries"][number] }
  );
  const entries: Entry[] = [];
  for (const job of jobs) {
    if (job.kind === "documents") {
      const received = data.events.filter(
        (e) => e.jobId === job.id && e.label === "Document received",
      );
      const assessment = data.events.find(
        (e) => e.jobId === job.id && e.label === "Assessing reliability",
      );
      if (received.length || !documents.length)
        entries.push({
          key: job.id + "-search",
          at: job.createdAt,
          rank: 1,
          kind: "job",
          job,
          stage: "search",
        });
      if (
        assessment ||
        (received.length === 0 && documents.length > 0) ||
        job.state === "done"
      )
        entries.push({
          key: job.id + "-assess",
          at: assessment?.createdAt || job.createdAt,
          rank: 2,
          kind: "job",
          job,
          stage: "assess",
        });
    } else
      entries.push({
        key: job.id,
        at: job.createdAt,
        rank: 2,
        kind: "job",
        job,
        stage: job.kind as "draft" | "review",
      });
  }
  messages.forEach((message) =>
    entries.push({
      key: message.id,
      at: message.createdAt,
      rank: 0,
      kind: "message",
      message,
    }),
  );
  deliveries.forEach((delivery) =>
    entries.push({
      key: delivery.id,
      at: delivery.createdAt,
      rank: 3,
      kind: "delivery",
      delivery,
    }),
  );
  entries.sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) ||
      a.rank - b.rank ||
      a.key.localeCompare(b.key),
  );
  return (
    <div className="page case-page">
      <div className="case-breadcrumb">
        <Link href="/tickets">
          <ArrowLeft size={16} />
          Customer questions
        </Link>
        <span aria-hidden="true">/</span>
        <span className="mono">
          TKT-{String(ticket.number).padStart(4, "0")}
        </span>
        <span className="case-category">Payroll Belgium</span>
      </div>
      <header className="case-heading">
        <div>
          <h1>{ticket.subject}</h1>
          <div className="case-heading-meta">
            <Status status={ticket.status} />
            <span>
              {ticket.customer} · {ticket.company}
            </span>
          </div>
        </div>
        <details className="case-menu" ref={actionsMenu}>
          <summary aria-label="More ticket actions">
            <MoreHorizontal size={21} />
          </summary>
          <div>
            <button
              disabled={!!busy || receivedEmail}
              onClick={() => openAction("colleague-email")}
            >
              <Mail size={15} />
              {receivedEmail
                ? "Colleague email added"
                : "Demo: receive colleague email"}
            </button>
            {ticket.isDemo && (
              <button disabled={!!busy} onClick={() => openAction("reset")}>
                <Clock3 size={15} />
                Restart demo
              </button>
            )}
          </div>
        </details>
      </header>
      {error && (
        <ErrorNotice
          error={error}
          onRetry={() => {
            setError("");
            void load();
          }}
        />
      )}
      <div className="case-layout">
        <div className="case-conversation">
          <div className="case-section-label">
            <MessageSquareText size={18} />
            <h2>Conversation</h2>
            <span>Oldest first</span>
          </div>
          <ol
            className="case-thread"
            aria-label="Ticket activity in chronological order"
          >
            <li className="thread-item">
              <span className="thread-avatar customer-avatar">
                {ticket.customer.slice(0, 1)}
              </span>
              <article className="thread-card original-question">
                <header>
                  <div>
                    <strong>{ticket.customer}</strong>
                    <SourceChip kind="chats">Customer question</SourceChip>
                  </div>
                  <time title={dateLabel(ticket.createdAt)}>
                    {dateLabel(ticket.createdAt, true)} ·{" "}
                    {timeLabel(ticket.createdAt)}
                  </time>
                </header>
                <div className="thread-mail-meta">
                  <Mail size={13} />
                  {ticket.email}
                </div>
                <p className="thread-body">{ticket.question}</p>
              </article>
            </li>
            {entries.map((entry) =>
              entry.kind === "job" ? (
                <AgentEntry
                  key={entry.key}
                  job={entry.job}
                  stage={entry.stage}
                  data={data}
                  busy={!!busy}
                  answerDirty={isDirty}
                  onRetry={() => void act("retry")}
                  onDocument={setSelected}
                />
              ) : entry.kind === "message" ? (
                <li
                  className="thread-item"
                  key={entry.key}
                  id={`bericht-${entry.message.id}`}
                >
                  <span
                    className={`thread-avatar ${entry.message.kind === "email" ? "colleague-avatar" : ""}`}
                  >
                    {entry.message.author
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <article className="thread-card">
                    <header>
                      <div>
                        <strong>{entry.message.author}</strong>
                        {entry.message.kind === "email" ? (
                          <SourceChip kind="chats">
                            Colleague email · demo
                          </SourceChip>
                        ) : (
                          <span className="thread-label">Internal note</span>
                        )}
                      </div>
                      <time>
                        {dateLabel(entry.at, true)} · {timeLabel(entry.at)}
                      </time>
                    </header>
                    <p className="thread-body">{entry.message.content}</p>
                    {entry.message.documentId && (
                      <button
                        className="thread-attachment"
                        onClick={() =>
                          setSelected(
                            documents.find(
                              (d) => d.id === entry.message.documentId,
                            ) || null,
                          )
                        }
                      >
                        <Paperclip size={15} />
                        {
                          documents.find(
                            (d) => d.id === entry.message.documentId,
                          )?.name
                        }
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </article>
                </li>
              ) : (
                <li className="thread-item" key={entry.key}>
                  <span className="thread-avatar sent-avatar">
                    <CheckCheck size={18} />
                  </span>
                  <article className="thread-card sent-card">
                    <header>
                      <div>
                        <strong>Sending simulated</strong>
                        <span className="thread-label label-success">
                          {entry.delivery.overridden
                            ? "Manually overridden"
                            : "Approved"}
                        </span>
                      </div>
                      <time>
                        {dateLabel(entry.at, true)} · {timeLabel(entry.at)}
                      </time>
                    </header>
                    <div className="thread-mail-meta">
                      To {entry.delivery.recipient} · {entry.delivery.subject}
                    </div>
                    <p className="thread-body">{entry.delivery.content}</p>
                  </article>
                </li>
              ),
            )}
            <li className="thread-item composer-item">
              <span className="thread-avatar">JD</span>
              <section
                className="thread-card case-composer"
                aria-label="Compose message"
              >
                <div className="composer-tabs">
                  <button
                    className={composer === "answer" ? "selected" : ""}
                    onClick={() => setComposer("answer")}
                    aria-pressed={composer === "answer"}
                  >
                    <Mail size={15} />
                    Answer to customer
                  </button>
                  <button
                    className={composer === "note" ? "selected" : ""}
                    onClick={() => setComposer("note")}
                    aria-pressed={composer === "note"}
                  >
                    <MessageSquareText size={15} />
                    Internal note
                  </button>
                </div>
                {composer === "note" ? (
                  <>
                    <p className="composer-recipient">
                      Only visible to your team · included as context for AI
                    </p>
                    <textarea
                      aria-label="Internal note"
                      placeholder="Add context or share a finding with your team…"
                      value={note}
                      disabled={!!busy}
                      maxLength={5000}
                      onChange={(e) => {
                        setNote(e.target.value);
                        noteId.current = null;
                      }}
                    />
                    <footer className="composer-footer">
                      <span>Will be added to the conversation</span>
                      <button
                        className="button secondary small"
                        disabled={!!busy || !note.trim()}
                        onClick={() => void act("message")}
                      >
                        {busy === "message" ? (
                          <Spinner size={14} />
                        ) : (
                          <MessageSquareText size={14} />
                        )}
                        Add note
                      </button>
                    </footer>
                  </>
                ) : (
                  <>
                    <div className="composer-recipient">
                      <span>
                        To <strong>{ticket.email}</strong>
                      </span>
                      <span className="simulation-chip">Demo</span>
                    </div>
                    <textarea
                      aria-label="Answer to customer"
                      placeholder="Write your answer to the customer, or let the writing agent suggest a draft…"
                      value={answer}
                      disabled={editorLocked}
                      maxLength={20000}
                      onChange={(e) => {
                        setAnswer(e.target.value);
                        dirty.current = true;
                        setIsDirty(true);
                      }}
                    />
                    <div className="composer-tools">
                      <button
                        className="text-button"
                        disabled={
                          !!busy ||
                          !!active ||
                          !documentsReady ||
                          !ai.configured
                        }
                        onClick={() =>
                          answer.trim()
                            ? setConfirm("draft")
                            : void act("draft")
                        }
                      >
                        <HunchIcon name="summary" size={16} />
                        Write with AI
                      </button>
                      <button
                        className="text-button save-draft"
                        disabled={!isDirty || !!busy}
                        onClick={() => void act("save")}
                      >
                        {busy === "save" ? <Spinner size={13} /> : null}
                        {isDirty ? "Save draft" : `Draft saved · v${version}`}
                      </button>
                    </div>
                    {draft && !isDirty && (
                      <details className="composer-citations">
                        <summary>
                          {draft.citations.length} citations for this draft
                        </summary>
                        {draft.citations.map((c, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setSelected(
                                documents.find((d) => d.id === c.documentId) ||
                                  null,
                              )
                            }
                          >
                            <strong>
                              {
                                documents.find((d) => d.id === c.documentId)
                                  ?.name
                              }
                            </strong>
                            <q>{c.quote}</q>
                          </button>
                        ))}
                      </details>
                    )}
                    <div className="send-gate">
                      <div className="send-gate-copy">
                        <ShieldCheck size={18} />
                        <div>
                          <strong>
                            {alreadySent && !isDirty
                              ? "This answer has been sent (simulation)"
                              : reviewValid
                                ? review?.verdict === "approved"
                                  ? "All checks passed. Ready to send."
                                  : "The review requests changes."
                                : isDirty && latestReview
                                  ? "Answer changed · check again"
                                  : "Check first, then send"}
                          </strong>
                          <p>
                            {reviewValid
                              ? "Read the findings in the timeline above."
                              : "The review agent checks your answer against the current sources."}
                          </p>
                        </div>
                      </div>
                      <div className="send-gate-actions">
                        <button
                          className="button secondary small"
                          disabled={
                            !!busy ||
                            !!active ||
                            !documentsReady ||
                            !answer.trim() ||
                            !ai.configured ||
                            (reviewValid && !isDirty)
                          }
                          onClick={() => void act("review")}
                        >
                          {active?.kind === "review" || busy === "review" ? (
                            <Spinner size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                          Check answer
                        </button>
                        <button
                          className="button primary small"
                          disabled={!!busy || !reviewValid || alreadySent}
                          onClick={() =>
                            review?.verdict === "changes_requested"
                              ? setConfirm("override")
                              : void act("send", { reviewId: latestReview?.id })
                          }
                        >
                          <Send size={14} />
                          {reviewValid &&
                          review?.verdict === "changes_requested"
                            ? "Send anyway"
                            : "Confirm and send"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </li>
          </ol>
          <p className="case-demo-footnote">
            Proof of concept · Email sending is simulated.
          </p>
        </div>
        <aside
          className="case-sources hunch-panel"
          aria-label="Hunch context for this ticket"
          aria-busy={running?.kind === "documents" ? "true" : undefined}
        >
          <div className="hunch-panel-top">
            <span className="hunch-panel-brand">
              <HunchMark size={26} />
              hunch
            </span>
            <span className="hunch-panel-id">
              TKT-{String(ticket.number).padStart(4, "0")}
            </span>
          </div>
          <div className="hunch-panel-body">
            <section className="sources-section">
              <div className="sources-heading">
                <h2>Documents</h2>
                {documents.length > 0 && (
                  <SourceChip kind="docs">{documents.length} found</SourceChip>
                )}
              </div>
              <p className="sources-intro">The sources behind your answer</p>
              <div className="source-list">
                {documents.map((doc, i) => (
                  <SourceCard
                    key={doc.id}
                    doc={doc}
                    index={i}
                    currentVersion={ticket.documentVersion}
                    onClick={() => setSelected(doc)}
                  />
                ))}
              </div>
              {!documents.length &&
                (active?.kind === "documents" ? (
                  <div className="source-list" aria-hidden="true">
                    <span className="hn-skel" />
                    <span className="hn-skel" />
                    <span className="hn-skel short" />
                  </div>
                ) : (
                  <div className="sources-empty">
                    <Search size={20} />
                    <p>Nothing found yet. Add a document yourself.</p>
                  </div>
                ))}
              <button
                className="source-add"
                onClick={() => setUpload(true)}
                disabled={!!busy}
              >
                <Upload size={16} />
                Add document
              </button>
              <p className="sources-disclaimer">
                Scores are AI estimates. Open a source for the explanation and
                any contradictions.
              </p>
            </section>
            {emails.length > 0 && (
              <section className="sources-section">
                <div className="sources-heading">
                  <h2>Chats & emails</h2>
                  <SourceChip kind="chats">{emails.length} found</SourceChip>
                </div>
                <div className="source-list">
                  {emails.map((mail) => (
                    <a
                      key={mail.id}
                      className="source-card hn-k-chats"
                      href={`#bericht-${mail.id}`}
                    >
                      <GlyphTile kind="chats" />
                      <span className="source-card-body">
                        <strong className="source-name">{mail.author}</strong>
                        <span className="source-card-meta">
                          Email · {dateLabel(mail.createdAt, true)}
                        </span>
                        <span className="source-snippet">{mail.content}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
            <section className="case-properties">
              <h3>Ticket details</h3>
              <dl>
                <div>
                  <dt>Assigned to</dt>
                  <dd>
                    <span className="mini-avatar">JD</span>Jamie De Clercq
                  </dd>
                </div>
                <div>
                  <dt>Organisation</dt>
                  <dd>{ticket.company}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>
                    {dateLabel(ticket.createdAt, true)},{" "}
                    {timeLabel(ticket.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </aside>
      </div>
      {upload && (
        <UploadModal
          id={id}
          onClose={() => setUpload(false)}
          onUploaded={() => {
            setUpload(false);
            void load();
          }}
        />
      )}
      {selected && (
        <DocumentModal
          doc={documents.find((d) => d.id === selected.id) || selected}
          currentVersion={ticket.documentVersion}
          onClose={() => setSelected(null)}
        />
      )}
      {confirm === "colleague-email" ? (
        <Modal
          title="A colleague shares more information"
          subtitle="Demo scenario · this email has not been added to the ticket yet."
          onClose={() => !busy && setConfirm(null)}
        >
          <div className="colleague-preview">
            <div className="email-envelope">
              <span>From</span>
              <strong>
                {colleagueEmail.author} &lt;{colleagueEmail.email}&gt;
              </strong>
              <span>Subject</span>
              <strong>{colleagueEmail.subject}</strong>
            </div>
            <p>{colleagueEmail.content}</p>
            <div className="thread-attachment">
              <Paperclip size={16} />
              {colleagueEmail.document.name}
            </div>
          </div>
          {error && <ErrorNotice error={error} />}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => setConfirm(null)}
            >
              Close
            </button>
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void act("colleague-email")}
            >
              {busy ? <Spinner /> : <Mail size={16} />}Add email & attachment
            </button>
          </div>
        </Modal>
      ) : (
        confirm && (
          <Modal
            title={
              confirm === "reset"
                ? "Restart the demonstration?"
                : confirm === "draft"
                  ? "Create a new AI draft?"
                  : "Send despite the AI's concerns?"
            }
            subtitle={
              confirm === "reset"
                ? "Uploads, messages, drafts and reviews for this original demo ticket will be deleted."
                : confirm === "draft"
                  ? "Gemini will replace your current text. The saved version stays in the answer history."
                  : "You confirm that you have read the findings. This choice is recorded. Sending remains a simulation."
            }
            onClose={() => !busy && setConfirm(null)}
          >
            {error && <ErrorNotice error={error} />}
            <div className="modal-actions">
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={!!busy}
                onClick={() =>
                  void act(
                    confirm,
                    confirm === "override"
                      ? { reviewId: latestReview?.id }
                      : {},
                  )
                }
              >
                {busy && <Spinner />}
                {confirm === "reset"
                  ? "Replay demo"
                  : confirm === "draft"
                    ? "Create draft"
                    : "Override and send"}
              </button>
            </div>
          </Modal>
        )
      )}
      <PipStatus
        activeId={running?.id ?? null}
        step={pipStep}
        outcomeOf={(jobId) => {
          const job = jobs.find((j) => j.id === jobId);
          if (!job) return null;
          return {
            done: job.state === "done",
            message:
              job.kind === "documents"
                ? "Sources assessed"
                : job.kind === "draft"
                  ? "Your draft is ready"
                  : "Check complete",
          };
        }}
      />
    </div>
  );
}

function AgentEntry({
  job,
  stage,
  data,
  busy,
  answerDirty,
  onRetry,
  onDocument,
}: {
  job: JobView;
  stage: "search" | "assess" | "draft" | "review";
  data: TicketDetail;
  busy: boolean;
  answerDirty: boolean;
  onRetry: () => void;
  onDocument: (doc: DocumentView) => void;
}) {
  const received = data.events.filter(
    (e) => e.jobId === job.id && e.label === "Document received",
  );
  const assessmentStarted = data.events.some(
    (e) => e.jobId === job.id && e.label === "Assessing reliability",
  );
  const searchDone =
    stage === "search" && (assessmentStarted || job.state === "done");
  const running = !searchDone && ["queued", "running"].includes(job.state);
  const failed = !searchDone && job.state === "failed";
  const obsolete = job.state === "obsolete";
  const stale =
    (stage === "review" && answerDirty) ||
    obsolete ||
    (stage !== "search" &&
      job.documentVersion !== data.ticket.documentVersion) ||
    job.generation !== data.ticket.generation ||
    (stage !== "search" &&
      stage !== "assess" &&
      (job.contextVersion !== data.ticket.contextVersion ||
        job.answerVersion + (stage === "draft" ? 1 : 0) !==
          data.ticket.answerVersion));
  const review =
    stage === "review" && job.state === "done"
      ? (job.result as ReviewResult)
      : null;
  const negative = review?.verdict === "changes_requested";
  const icon =
    stage === "search" ? (
      <Search size={16} />
    ) : stage === "draft" ? (
      <HunchIcon name="summary" size={16} />
    ) : (
      <ShieldCheck size={16} />
    );
  const title =
    stage === "search"
      ? "Knowledge agent is finding relevant documents"
      : stage === "assess"
        ? "Source agent is assessing reliability"
        : stage === "draft"
          ? "Writing agent is creating a draft"
          : "Review agent is checking the answer";
  const state = stale
    ? "Earlier version"
    : failed
      ? "Interrupted"
      : running
        ? job.state === "queued"
          ? "Scheduled"
          : "In progress"
        : negative
          ? "Changes needed"
          : "Complete";
  const isLatest = data.jobs[0]?.id === job.id;
  const failureMessage = !isLatest
    ? "This attempt was interrupted. The next steps are shown below."
    : !data.ai.configured
      ? "Gemini is not connected yet. The documents are available; the assessment is waiting for a connection."
      : job.error;
  const at =
    stage === "assess"
      ? data.events.find(
          (e) => e.jobId === job.id && e.label === "Assessing reliability",
        )?.createdAt || job.createdAt
      : job.createdAt;
  return (
    <li className={`thread-item agent-item ${running ? "agent-running" : ""}`}>
      <span
        className={`thread-avatar agent-avatar agent-${stage} ${failed ? "agent-warning" : ""}`}
      >
        {running ? <Spinner size={16} /> : icon}
      </span>
      <div className="agent-content">
        <div className="agent-heading">
          <strong>{title}</strong>
          <span
            className={`agent-state ${failed || negative ? "needs-attention" : !running && !stale ? "done" : ""}`}
          >
            {!running && !failed && !stale && !negative && <Check size={14} />}
            {state}
          </span>
          <time title={dateLabel(at)}>{timeLabel(at)}</time>
        </div>
        {stage === "search" ? (
          <p>
            {searchDone
              ? `${received.length || 3} documents found and passed to the source agent.`
              : running
                ? "The knowledge base is being searched. Documents appear on the right."
                : "Document research was interrupted."}
          </p>
        ) : stage === "assess" ? (
          <p>
            {job.state === "done"
              ? "Source type, age, applicability and contradictions have been assessed."
              : failed
                ? failureMessage
                : "The agent compares documents and explains each source's reliability."}
          </p>
        ) : stage === "draft" ? (
          <p>
            {job.state === "done"
              ? "An editable draft with citations has been added to the editor."
              : failed
                ? !data.ai.configured
                  ? "Connect Gemini to create a draft."
                  : job.error
                : "The agent is writing an answer based on the sources and conversation."}
          </p>
        ) : (
          <p>
            {review
              ? review.summary
              : failed
                ? !data.ai.configured
                  ? "Connect Gemini to check the answer."
                  : job.error
                : "The answer is being checked for relevance, supporting evidence, missing information and contradictions."}
          </p>
        )}
        {failed && isLatest && (
          <div className="agent-actions">
            {!data.ai.configured && (
              <Link className="text-button" href="/instellingen">
                Set up connection
                <ChevronRight size={13} />
              </Link>
            )}
            <button className="text-button" onClick={onRetry} disabled={busy}>
              Try again
            </button>
          </div>
        )}
        {running && job.dispatchError && (
          <div className="agent-actions">
            <span>{job.dispatchError}</span>
            <button className="text-button" onClick={onRetry} disabled={busy}>
              Reschedule
            </button>
          </div>
        )}
        {review && (
          <details className="agent-checks">
            <summary>
              <ChevronDown size={14} />
              View {review.findings.length}{" "}
              {review.findings.length === 1 ? "finding" : "findings"}{" "}
              {stale && "· no longer current"}
            </summary>
            <div>
              {review.findings.map((finding, i) => (
                <div
                  className={`review-finding finding-${finding.severity}`}
                  key={i}
                >
                  <strong>
                    {
                      {
                        relevance: "Relevance",
                        evidence: "Supporting evidence",
                        missing: "Missing information",
                        contradiction: "Contradiction",
                      }[finding.category]
                    }
                  </strong>
                  {finding.passage && (
                    <blockquote>{finding.passage}</blockquote>
                  )}
                  <p>{finding.explanation}</p>
                  {finding.citations.map((citation, j) => {
                    const doc = data.documents.find(
                      (d) => d.id === citation.documentId,
                    );
                    return (
                      <button
                        className="citation-evidence"
                        key={j}
                        onClick={() => doc && onDocument(doc)}
                      >
                        <FileText size={14} />
                        <span>
                          <strong>{doc?.name || "Source"}</strong>
                          <q>{citation.quote}</q>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        )}
        {stage === "search" && received.length > 0 && (
          <details className="agent-checks">
            <summary>
              <ChevronDown size={14} />
              Documents found
            </summary>
            <ul>
              {received.map((e) => (
                <li key={e.id}>{e.detail}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}
function SourceCard({
  doc,
  index,
  currentVersion,
  onClick,
}: {
  doc: DocumentView;
  index: number;
  currentVersion: number;
  onClick: () => void;
}) {
  const assessment =
    doc.assessedVersion === currentVersion ? doc.assessment : null;
  return (
    <button
      className="source-card hn-k-docs"
      onClick={onClick}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <GlyphTile kind="docs" />
      <span className="source-card-body">
        <strong className="source-name">{doc.name}</strong>
        <span className="source-card-meta">
          {doc.kind} · {dateLabel(doc.date, true)}
          {doc.date && ` ${doc.date.slice(0, 4)}`}
          {doc.fictional && " · Fictional source"}
        </span>
        {assessment ? (
          <Relevance
            value={assessment.score}
            label={assessment.jev ? "relevant" : "reliable"}
          />
        ) : (
          <span className="source-unscored">Not assessed yet</span>
        )}
        {assessment?.contradictions.length ? (
          <span className="source-conflict">
            <TriangleAlert size={14} />
            Contradiction found
          </span>
        ) : null}
      </span>
    </button>
  );
}
export function DocumentCard({
  doc,
  currentVersion,
  index,
  onClick,
}: {
  doc: DocumentView;
  currentVersion: number;
  index: number;
  onClick: () => void;
}) {
  const assessment =
    doc.assessedVersion === currentVersion ? doc.assessment : null;
  const score = assessment?.score;
  return (
    <button
      className="document-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        className={`file-icon ${doc.kind === "Legislative" ? "file-blue" : doc.date && doc.date < "2024" ? "file-amber" : "file-violet"}`}
      >
        <FileText size={23} />
        <span>
          {doc.name.toLowerCase().endsWith(".docx")
            ? "DOCX"
            : doc.name.toLowerCase().endsWith(".txt")
              ? "TXT"
              : "DOC"}
        </span>
      </div>
      <div className="document-info">
        <strong>{doc.name}</strong>
        <span>
          {doc.kind}
          <i /> {dateLabel(doc.date, true)}
          {doc.date && (
            <span className="doc-year"> {doc.date.slice(0, 4)}</span>
          )}
        </span>
        <small>
          {assessment ? (
            assessment.contradictions.length ? (
              <>
                <TriangleAlert size={12} />
                Possible conflict · view explanation
              </>
            ) : (
              <>
                <Check size={12} />
                Assessed for source and context
              </>
            )
          ) : (
            <>
              <Clock3 size={12} />
              Not assessed yet
            </>
          )}
        </small>
      </div>
      {score !== undefined ? (
        <div
          className={`score ${score >= 80 ? "score-high" : score >= 50 ? "score-mid" : "score-low"}`}
          style={{ "--score": `${score}%` } as React.CSSProperties}
        >
          <span>
            {score}
            <small>%</small>
          </span>
        </div>
      ) : (
        <div className="score-pending">
          —<small>score</small>
        </div>
      )}
      <ChevronRight size={16} className="document-chevron" />
    </button>
  );
}
export function DocumentModal({
  doc,
  currentVersion,
  onClose,
}: {
  doc: DocumentView;
  currentVersion: number;
  onClose: () => void;
}) {
  const assessment =
    doc.assessedVersion === currentVersion ? doc.assessment : null;
  return (
    <Modal
      title={doc.name}
      subtitle={`${doc.kind} · ${dateLabel(doc.date)}`}
      onClose={onClose}
    >
      {doc.fictional && (
        <div className="inline-info">
          <Info size={17} />
          Fictional demonstration material. Not official legislation or an
          internal SD Worx document.
        </div>
      )}
      {assessment ? (
        <>
          <div className="assessment-summary">
            <span
              className={`score-text ${assessment.score >= 80 ? "text-green" : "text-amber"}`}
            >
              {assessment.score}
              <small>%</small>
            </span>
            <div>
              <strong>
                {assessment.jev
                  ? "Relevance to this customer question"
                  : "AI estimate of reliability"}
              </strong>
              <p>{assessment.summary}</p>
            </div>
          </div>
          {assessment.jev && (
            <>
              <div className="assessment-grid">
                {(
                  [
                    ["Relevance", assessment.jev.relevance],
                    ["Source reliability", assessment.jev.reliability],
                    ["Freshness", assessment.jev.freshness],
                  ] as const
                ).map(([label, dimension]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <p>
                      {dimension
                        ? `${dimension.score}/100 · model confidence ${Math.round(dimension.confidence * 100)}%`
                        : "Unknown · no valid source date"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="small-copy">
                Jev assesses, Gemini explains. Scores and model confidence are
                AI estimates, not a guarantee of accuracy.
                {` Assessed on ${dateLabel(assessment.jev.assessedAt)}.`}
              </p>
            </>
          )}
          <div className="assessment-grid">
            {[
              ["Source & authority", assessment.source],
              ["Freshness", assessment.age],
              ["Applicability", assessment.relevance],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <p>{value}</p>
              </div>
            ))}
          </div>
          {assessment.contradictions.length > 0 && (
            <div className="conflict-details">
              <strong>
                <TriangleAlert size={16} />
                Contradictions
              </strong>
              {assessment.contradictions.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="pending-assessment">
          <ShieldCheck size={20} />
          <p>The current document assessment is not available yet.</p>
        </div>
      )}
      <h3 className="source-content-heading">Source text</h3>
      <div className="source-content">{doc.content}</div>
    </Modal>
  );
}
function UploadModal({
  id,
  onClose,
  onUploaded,
}: {
  id: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="Add knowledge"
      subtitle="New information automatically starts a new source assessment."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) {
            setError("Choose a file first.");
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            setError("The file is larger than 10 MB.");
            return;
          }
          const form = new FormData(e.currentTarget);
          form.set("file", file);
          setBusy(true);
          setError("");
          try {
            await request(`/api/tickets/${id}/upload`, {
              method: "POST",
              body: form,
            });
            onUploaded();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label
          className="file-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFile(e.dataTransfer.files[0] || null);
          }}
        >
          <Upload size={27} />
          <strong>{file ? file.name : "Drag a document here"}</strong>
          <span>
            {file
              ? `${(file.size / 1024).toFixed(0)} KB · click to replace`
              : "or click to choose a file"}
          </span>
          <small>PDF with text, TXT or DOCX · up to 10 MB</small>
          <input
            type="file"
            aria-label="Choose document"
            accept=".pdf,.txt,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="form-grid">
          <label>
            Source type
            <select name="kind" defaultValue="Unknown">
              {sourceKinds.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label>
            Document date <span className="optional">optional</span>
            <input type="date" name="date" />
          </label>
        </div>
        <div className="inline-info">
          <Info size={17} />
          Unknown source details remain visible as uncertainty. Your existing
          answer is preserved.
        </div>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button
            className="button secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Upload size={16} />}Add & assess
          </button>
        </div>
      </form>
    </Modal>
  );
}
