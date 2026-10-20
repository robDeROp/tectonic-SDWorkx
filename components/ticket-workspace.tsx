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
            "Je antwoord is gewijzigd. Laat de nieuwe versie eerst controleren.",
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
            <p>Je ticket wordt geopend…</p>
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
          (e) =>
            e.jobId === running.id && e.label === "Betrouwbaarheid beoordelen",
        )
        ? "Betrouwbaarheid beoordelen"
        : "Kennisbank doorzoeken"
      : running.kind === "draft"
        ? "Concept schrijven"
        : "Antwoord controleren";
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
        (e) => e.jobId === job.id && e.label === "Document ontvangen",
      );
      const assessment = data.events.find(
        (e) => e.jobId === job.id && e.label === "Betrouwbaarheid beoordelen",
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
        <Link href="/">
          <ArrowLeft size={16} />
          Klantvragen
        </Link>
        <span aria-hidden="true">/</span>
        <span className="mono">
          TKT-{String(ticket.number).padStart(4, "0")}
        </span>
        <span className="case-category">Payroll België</span>
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
          <summary aria-label="Meer ticketacties">
            <MoreHorizontal size={21} />
          </summary>
          <div>
            <button
              disabled={!!busy || receivedEmail}
              onClick={() => openAction("colleague-email")}
            >
              <Mail size={15} />
              {receivedEmail
                ? "Collega-mail toegevoegd"
                : "Demo: collega-mail ontvangen"}
            </button>
            {ticket.isDemo && (
              <button disabled={!!busy} onClick={() => openAction("reset")}>
                <Clock3 size={15} />
                Demo opnieuw starten
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
            <h2>Conversatie</h2>
            <span>Oudste eerst</span>
          </div>
          <ol
            className="case-thread"
            aria-label="Chronologische ticketactiviteit"
          >
            <li className="thread-item">
              <span className="thread-avatar customer-avatar">
                {ticket.customer.slice(0, 1)}
              </span>
              <article className="thread-card original-question">
                <header>
                  <div>
                    <strong>{ticket.customer}</strong>
                    <SourceChip kind="chats">Klantvraag</SourceChip>
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
                            Collega-mail · demo
                          </SourceChip>
                        ) : (
                          <span className="thread-label">Interne notitie</span>
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
                        <strong>Verzending gesimuleerd</strong>
                        <span className="thread-label label-success">
                          {entry.delivery.overridden
                            ? "Bewust overruled"
                            : "Goedgekeurd"}
                        </span>
                      </div>
                      <time>
                        {dateLabel(entry.at, true)} · {timeLabel(entry.at)}
                      </time>
                    </header>
                    <div className="thread-mail-meta">
                      Aan {entry.delivery.recipient} · {entry.delivery.subject}
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
                aria-label="Bericht opstellen"
              >
                <div className="composer-tabs">
                  <button
                    className={composer === "answer" ? "selected" : ""}
                    onClick={() => setComposer("answer")}
                    aria-pressed={composer === "answer"}
                  >
                    <Mail size={15} />
                    Antwoord aan klant
                  </button>
                  <button
                    className={composer === "note" ? "selected" : ""}
                    onClick={() => setComposer("note")}
                    aria-pressed={composer === "note"}
                  >
                    <MessageSquareText size={15} />
                    Interne notitie
                  </button>
                </div>
                {composer === "note" ? (
                  <>
                    <p className="composer-recipient">
                      Alleen zichtbaar voor je team · telt mee als context voor
                      AI
                    </p>
                    <textarea
                      aria-label="Interne notitie"
                      placeholder="Voeg context toe of deel een bevinding met je team…"
                      value={note}
                      disabled={!!busy}
                      maxLength={5000}
                      onChange={(e) => {
                        setNote(e.target.value);
                        noteId.current = null;
                      }}
                    />
                    <footer className="composer-footer">
                      <span>Wordt toegevoegd aan de conversatie</span>
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
                        Notitie toevoegen
                      </button>
                    </footer>
                  </>
                ) : (
                  <>
                    <div className="composer-recipient">
                      <span>
                        Aan <strong>{ticket.email}</strong>
                      </span>
                      <span className="simulation-chip">Demo</span>
                    </div>
                    <textarea
                      aria-label="Antwoord aan klant"
                      placeholder="Schrijf je antwoord aan de klant, of laat de schrijfagent een concept voorstellen…"
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
                        Schrijf met AI
                      </button>
                      <button
                        className="text-button save-draft"
                        disabled={!isDirty || !!busy}
                        onClick={() => void act("save")}
                      >
                        {busy === "save" ? <Spinner size={13} /> : null}
                        {isDirty
                          ? "Concept opslaan"
                          : `Concept opgeslagen · v${version}`}
                      </button>
                    </div>
                    {draft && !isDirty && (
                      <details className="composer-citations">
                        <summary>
                          {draft.citations.length} bronverwijzingen bij dit
                          concept
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
                              ? "Dit antwoord is verzonden (simulatie)"
                              : reviewValid
                                ? review?.verdict === "approved"
                                  ? "Alle controles geslaagd. Klaar om te verzenden."
                                  : "De review vraagt om aanpassingen."
                                : isDirty && latestReview
                                  ? "Antwoord gewijzigd · opnieuw controleren"
                                  : "Eerst controleren, dan verzenden"}
                          </strong>
                          <p>
                            {reviewValid
                              ? "Lees de bevindingen in de tijdlijn hierboven."
                              : "De reviewagent toetst je antwoord aan de actuele bronnen."}
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
                          Antwoord controleren
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
                            ? "Toch verzenden"
                            : "Definitief verzenden"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </li>
          </ol>
          <p className="case-demo-footnote">
            Proof of concept · E-mailverzending wordt gesimuleerd.
          </p>
        </div>
        <aside
          className="case-sources hunch-panel"
          aria-label="Hunch-context bij dit ticket"
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
                <h2>Documenten</h2>
                {documents.length > 0 && (
                  <SourceChip kind="docs">
                    {documents.length} gevonden
                  </SourceChip>
                )}
              </div>
              <p className="sources-intro">De bronnen achter je antwoord</p>
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
                    <p>Nog niets gevonden. Voeg zelf een document toe.</p>
                  </div>
                ))}
              <button
                className="source-add"
                onClick={() => setUpload(true)}
                disabled={!!busy}
              >
                <Upload size={16} />
                Document toevoegen
              </button>
              <p className="sources-disclaimer">
                Scores zijn AI-inschattingen. Open een bron voor de toelichting
                en eventuele tegenstrijdigheden.
              </p>
            </section>
            {emails.length > 0 && (
              <section className="sources-section">
                <div className="sources-heading">
                  <h2>Chats & e-mails</h2>
                  <SourceChip kind="chats">{emails.length} gevonden</SourceChip>
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
                          E-mail · {dateLabel(mail.createdAt, true)}
                        </span>
                        <span className="source-snippet">{mail.content}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
            <section className="case-properties">
              <h3>Ticketgegevens</h3>
              <dl>
                <div>
                  <dt>Behandelaar</dt>
                  <dd>
                    <span className="mini-avatar">JD</span>Jamie De Clercq
                  </dd>
                </div>
                <div>
                  <dt>Organisatie</dt>
                  <dd>{ticket.company}</dd>
                </div>
                <div>
                  <dt>Ontvangen</dt>
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
          title="Een collega deelt extra informatie"
          subtitle="Demoscenario · deze mail is nog niet toegevoegd aan het ticket."
          onClose={() => !busy && setConfirm(null)}
        >
          <div className="colleague-preview">
            <div className="email-envelope">
              <span>Van</span>
              <strong>
                {colleagueEmail.author} &lt;{colleagueEmail.email}&gt;
              </strong>
              <span>Onderwerp</span>
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
              Sluiten
            </button>
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void act("colleague-email")}
            >
              {busy ? <Spinner /> : <Mail size={16} />}Mail & bijlage toevoegen
            </button>
          </div>
        </Modal>
      ) : (
        confirm && (
          <Modal
            title={
              confirm === "reset"
                ? "Demonstratie opnieuw starten?"
                : confirm === "draft"
                  ? "Een nieuw AI-concept maken?"
                  : "Verzenden ondanks de AI-bezwaren?"
            }
            subtitle={
              confirm === "reset"
                ? "Uploads, berichten, concepten en reviews van dit oorspronkelijke demoticket worden verwijderd."
                : confirm === "draft"
                  ? "Gemini vervangt je huidige tekst. De opgeslagen versie blijft in de antwoordhistoriek."
                  : "Je bevestigt dat je de bevindingen hebt gelezen. Deze keuze wordt geregistreerd. De verzending blijft een simulatie."
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
                Annuleren
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
                  ? "Demo herhalen"
                  : confirm === "draft"
                    ? "Concept maken"
                    : "Bewust toch verzenden"}
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
                ? "Bronnen beoordeeld"
                : job.kind === "draft"
                  ? "Je concept staat klaar"
                  : "Controle afgerond",
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
    (e) => e.jobId === job.id && e.label === "Document ontvangen",
  );
  const assessmentStarted = data.events.some(
    (e) => e.jobId === job.id && e.label === "Betrouwbaarheid beoordelen",
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
      ? "Kennisagent zoekt relevante documenten"
      : stage === "assess"
        ? "Bronagent beoordeelt betrouwbaarheid"
        : stage === "draft"
          ? "Schrijfagent maakt een concept"
          : "Reviewagent controleert het antwoord";
  const state = stale
    ? "Eerdere versie"
    : failed
      ? "Onderbroken"
      : running
        ? job.state === "queued"
          ? "Ingepland"
          : "Bezig"
        : negative
          ? "Aanpassing nodig"
          : "Voltooid";
  const isLatest = data.jobs[0]?.id === job.id;
  const failureMessage = !isLatest
    ? "Deze poging werd onderbroken. De vervolgstappen staan hieronder."
    : !data.ai.configured
      ? "Gemini is nog niet verbonden. De documenten zijn beschikbaar; de beoordeling wacht op een verbinding."
      : job.error;
  const at =
    stage === "assess"
      ? data.events.find(
          (e) => e.jobId === job.id && e.label === "Betrouwbaarheid beoordelen",
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
              ? `${received.length || 3} documenten gevonden en doorgegeven aan de bronagent.`
              : running
                ? "De kennisbank wordt doorzocht. Documenten verschijnen rechts."
                : "Het documentonderzoek is onderbroken."}
          </p>
        ) : stage === "assess" ? (
          <p>
            {job.state === "done"
              ? "Bronsoort, ouderdom, toepasbaarheid en tegenstrijdigheden zijn beoordeeld."
              : failed
                ? failureMessage
                : "De agent vergelijkt de documenten en onderbouwt de betrouwbaarheid per bron."}
          </p>
        ) : stage === "draft" ? (
          <p>
            {job.state === "done"
              ? "Een bewerkbaar concept met bronverwijzingen is toegevoegd aan de editor."
              : failed
                ? !data.ai.configured
                  ? "Verbind Gemini om een concept te maken."
                  : job.error
                : "De agent formuleert een antwoord op basis van de bronnen en conversatie."}
          </p>
        ) : (
          <p>
            {review
              ? review.summary
              : failed
                ? !data.ai.configured
                  ? "Verbind Gemini om het antwoord te controleren."
                  : job.error
                : "Het antwoord wordt getoetst op relevantie, onderbouwing, ontbrekende informatie en tegenstrijdigheden."}
          </p>
        )}
        {failed && isLatest && (
          <div className="agent-actions">
            {!data.ai.configured && (
              <Link className="text-button" href="/instellingen">
                Verbinding instellen
                <ChevronRight size={13} />
              </Link>
            )}
            <button className="text-button" onClick={onRetry} disabled={busy}>
              Opnieuw proberen
            </button>
          </div>
        )}
        {running && job.dispatchError && (
          <div className="agent-actions">
            <span>{job.dispatchError}</span>
            <button className="text-button" onClick={onRetry} disabled={busy}>
              Opnieuw inplannen
            </button>
          </div>
        )}
        {review && (
          <details className="agent-checks">
            <summary>
              <ChevronDown size={14} />
              {review.findings.length}{" "}
              {review.findings.length === 1 ? "bevinding" : "bevindingen"}{" "}
              bekijken {stale && "· niet meer actueel"}
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
                        relevance: "Relevantie",
                        evidence: "Onderbouwing",
                        missing: "Ontbrekende informatie",
                        contradiction: "Tegenstrijdigheid",
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
                          <strong>{doc?.name || "Bron"}</strong>
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
              Gevonden documenten
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
          {doc.fictional && " · Fictieve bron"}
        </span>
        {assessment ? (
          <Relevance value={assessment.score} label={assessment.jev ? "relevant" : "betrouwbaar"} />
        ) : (
          <span className="source-unscored">Nog niet beoordeeld</span>
        )}
        {assessment?.contradictions.length ? (
          <span className="source-conflict">
            <TriangleAlert size={14} />
            Tegenstrijdigheid gevonden
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
        className={`file-icon ${doc.kind === "Wetgevingsgericht" ? "file-blue" : doc.date && doc.date < "2024" ? "file-amber" : "file-violet"}`}
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
                Mogelijk conflict · bekijk de toelichting
              </>
            ) : (
              <>
                <Check size={12} />
                Beoordeeld op bron en context
              </>
            )
          ) : (
            <>
              <Clock3 size={12} />
              Nog niet beoordeeld
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
          Fictief demonstratiemateriaal. Geen officiële wetgeving of intern SD
          Worx-document.
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
              <strong>{assessment.jev ? "Relevantie voor deze klantvraag" : "AI-inschatting van betrouwbaarheid"}</strong>
              <p>{assessment.summary}</p>
            </div>
          </div>
          {assessment.jev && (
            <>
              <div className="assessment-grid">
                {([
                  ["Relevantie", assessment.jev.relevance],
                  ["Bronbetrouwbaarheid", assessment.jev.reliability],
                  ["Actualiteit", assessment.jev.freshness],
                ] as const).map(([label, dimension]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <p>{dimension ? `${dimension.score}/100 · modelzekerheid ${Math.round(dimension.confidence * 100)}%` : "Onbekend · geen geldige brondatum"}</p>
                  </div>
                ))}
              </div>
              <p className="small-copy">
                Jev beoordeelt, Gemini licht toe. Scores en modelzekerheid zijn
                AI-inschattingen, geen garantie op juistheid.
                {` Beoordeeld op ${dateLabel(assessment.jev.assessedAt)}.`}
              </p>
            </>
          )}
          <div className="assessment-grid">
            {[
              ["Bron & gezag", assessment.source],
              ["Actualiteit", assessment.age],
              ["Toepasselijkheid", assessment.relevance],
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
                Tegenstrijdigheden
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
          <p>De actuele documentbeoordeling is nog niet beschikbaar.</p>
        </div>
      )}
      <h3 className="source-content-heading">Brontekst</h3>
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
      title="Voeg kennis toe"
      subtitle="Nieuwe informatie start automatisch een nieuwe bronbeoordeling."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) {
            setError("Kies eerst een bestand.");
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            setError("Het bestand is groter dan 10 MB.");
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
          <strong>{file ? file.name : "Sleep een document hierheen"}</strong>
          <span>
            {file
              ? `${(file.size / 1024).toFixed(0)} KB · klik om te vervangen`
              : "of klik om een bestand te kiezen"}
          </span>
          <small>PDF met tekst, TXT of DOCX · maximaal 10 MB</small>
          <input
            type="file"
            aria-label="Kies document"
            accept=".pdf,.txt,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="form-grid">
          <label>
            Type bron
            <select name="kind" defaultValue="Onbekend">
              {sourceKinds.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label>
            Documentdatum <span className="optional">optioneel</span>
            <input type="date" name="date" />
          </label>
        </div>
        <div className="inline-info">
          <Info size={17} />
          Onbekende brongegevens blijven zichtbaar als onzekerheid. Je bestaande
          antwoord blijft behouden.
        </div>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button
            className="button secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Annuleren
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Upload size={16} />}Toevoegen & beoordelen
          </button>
        </div>
      </form>
    </Modal>
  );
}
