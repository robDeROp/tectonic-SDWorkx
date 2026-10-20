"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Archive,
  CheckCheck,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Link2,
  Mail,
  MessageSquareText,
  Plus,
  Presentation,
  RotateCcw,
  ShieldCheck,
  Clock3,
  Users,
} from "lucide-react";
import { dateLabel, timeLabel } from "@/lib/client";
import type {
  DocumentView,
  HunchDiscussion,
  ReviewResult,
  TicketDetail,
} from "@/lib/types";
import { HunchMark } from "./hunch";
import { Modal, Spinner } from "./ui";

const channels = {
  email: "E-mail",
  teams: "Teams-bericht",
  other: "Ingevoerde vraag",
};
const lifecycleLabels = {
  open: "Open",
  closed: "Gesloten",
  archived: "Gearchiveerd",
};
type Category = "people" | "discussions" | "hunches";

export function HunchOverview({
  data,
  busy,
  dirty,
  onAction,
  onUpload,
  onDocument,
  children,
  activity,
}: {
  data: TicketDetail;
  busy: boolean;
  dirty: boolean;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  onUpload: () => void;
  onDocument: (doc: DocumentView) => void;
  children: React.ReactNode;
  activity: React.ReactNode;
}) {
  const { ticket, documents, related, discussions } = data;
  const [category, setCategory] = useState<Category>("people");
  const [discussion, setDiscussion] = useState<HunchDiscussion | null>(null);
  const [linking, setLinking] = useState(false);
  const composer = useRef<HTMLDetailsElement>(null);
  const active = data.jobs.find((job) =>
    ["queued", "running"].includes(job.state),
  );
  const failed = !active && data.jobs[0]?.state === "failed";
  const editable = ticket.lifecycle === "open";
  const people = useMemo(() => {
    const byName = new Map<string, HunchDiscussion>();
    discussions.forEach((item) => {
      const previous = byName.get(item.author);
      if (!previous || previous.score < item.score)
        byName.set(item.author, item);
    });
    return [...byName.values()].sort((a, b) => b.score - a.score);
  }, [discussions]);
  const scored = documents.filter(
    (doc) => doc.assessment && doc.assessedVersion === ticket.documentVersion,
  );
  const conflicts = scored.filter(
    (doc) => doc.assessment!.contradictions.length > 0,
  );
  const allScored = documents.length > 0 && scored.length === documents.length;
  const currentReview = data.jobs.find(
    (job) =>
      job.kind === "review" &&
      job.state === "done" &&
      job.generation === ticket.generation &&
      job.documentVersion === ticket.documentVersion &&
      job.contextVersion === ticket.contextVersion &&
      job.answerVersion === ticket.answerVersion,
  );
  const canClose = allScored && !!currentReview && !active && !dirty;
  const review = currentReview?.result as ReviewResult | undefined;
  const categories = [
    {
      key: "people" as const,
      title: "Mensen",
      count: people.length,
      Icon: Users,
    },
    {
      key: "discussions" as const,
      title: "Gesprekken",
      count: discussions.length,
      Icon: MessageSquareText,
    },
    {
      key: "hunches" as const,
      title: "Hunches",
      count: related.length,
      Icon: Link2,
    },
  ];
  const chooseAnswer = () => {
    if (!composer.current) return;
    composer.current.open = true;
    composer.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const recommendation = !editable
    ? {
        title:
          ticket.lifecycle === "closed"
            ? "Deze Hunch is afgerond"
            : "Deze Hunch is gearchiveerd",
        detail: "Heropen de Hunch om verder te werken.",
        label: "Heropenen",
        action: () => onAction("lifecycle", { lifecycle: "open" }),
      }
    : active
      ? {
          title:
            active.kind === "documents"
              ? "Pip verzamelt en beoordeelt de kennis"
              : active.kind === "draft"
                ? "Je concept wordt geschreven"
                : "Je antwoord wordt gecontroleerd",
          detail: "Nieuwe resultaten verschijnen vanzelf in de tijdlijn.",
          label: "Bezig…",
          action: () => {},
        }
      : !documents.length
        ? {
            title: "Vul de vraag aan met een bron",
            detail:
              "Voeg een document toe. Pip beoordeelt de nieuwe informatie automatisch.",
            label: "Bron toevoegen",
            action: onUpload,
          }
        : !data.ai.configured
          ? {
              title: "Verbind Pip om de kennis te beoordelen",
              detail:
                "Je bronnen staan klaar. Verbind de kennisassistent voor scores en een onderbouwd antwoord.",
              label: "Verbinding instellen",
              href: "/instellingen",
              action: () => {},
            }
          : failed || !allScored
            ? {
                title: "Laat de bronnen beoordelen",
                detail:
                  "De beoordeling is nog niet afgerond. Probeer opnieuw om met actuele scores verder te gaan.",
                label: "Opnieuw beoordelen",
                action: () => onAction("retry"),
              }
            : conflicts.length
              ? {
                  title: "Vergelijk de tegenstrijdige bronnen",
                  detail: `${conflicts.length} ${conflicts.length === 1 ? "bron vraagt" : "bronnen vragen"} om jouw afweging voordat je antwoordt.`,
                  label: "Bekijk de bron",
                  action: () => onDocument(conflicts[0]),
                }
              : review?.verdict === "changes_requested" && !dirty
                ? {
                    title: "Werk je antwoord bij",
                    detail:
                      "De controle vraagt om aanpassingen. Bekijk de bevindingen in de tijdlijn.",
                    label: "Antwoord aanpassen",
                    action: chooseAnswer,
                  }
                : canClose
                  ? {
                      title: "Klaar om af te ronden",
                      detail:
                        "De bronnen en je antwoord zijn beoordeeld. Bewaar het resultaat als afgeronde Hunch.",
                      label: "Hunch sluiten",
                      action: () =>
                        onAction("lifecycle", { lifecycle: "closed" }),
                    }
                  : {
                      title:
                        ticket.answer || dirty
                          ? "Controleer je antwoord"
                          : "Werk een antwoord uit",
                      detail:
                        ticket.answer || dirty
                          ? "Toets je antwoord aan de verzamelde kennis voordat je het verstuurt."
                          : "De bronnen zijn beoordeeld. Schrijf je antwoord of laat Pip een concept maken.",
                      label:
                        ticket.answer || dirty
                          ? "Naar je antwoord"
                          : "Antwoord opstellen",
                      action: chooseAnswer,
                    };

  return (
    <>
      <div className="hunch-breadcrumb">
        <Link href="/hunches">
          <ArrowLeft size={14} /> Alle Hunches
        </Link>
      </div>
      <header className="hunch-heading">
        <div className="hunch-heading-meta">
          <span className="mono">
            HNG-{String(ticket.number).padStart(4, "0")}
          </span>
          <span className={`hunch-state hunch-state-${ticket.lifecycle}`}>
            {ticket.lifecycle === "closed" ? (
              <CheckCheck size={12} />
            ) : ticket.lifecycle === "archived" ? (
              <Archive size={12} />
            ) : (
              <span />
            )}
            {lifecycleLabels[ticket.lifecycle]}
          </span>
          <details className="hunch-actions-menu">
            <summary aria-label="Hunch-status wijzigen">
              <ChevronDown size={17} />
            </summary>
            <div>
              {editable ? (
                <>
                  <button
                    disabled={busy || !canClose}
                    onClick={() =>
                      onAction("lifecycle", { lifecycle: "closed" })
                    }
                  >
                    <CheckCheck size={16} />
                    Hunch sluiten
                  </button>
                  <button
                    disabled={busy || dirty}
                    onClick={() =>
                      onAction("lifecycle", { lifecycle: "archived" })
                    }
                  >
                    <Archive size={16} />
                    Archiveren
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={busy}
                    onClick={() => onAction("lifecycle", { lifecycle: "open" })}
                  >
                    <RotateCcw size={16} />
                    Heropenen
                  </button>
                  {ticket.lifecycle === "closed" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction("lifecycle", { lifecycle: "archived" })
                      }
                    >
                      <Archive size={16} />
                      Archiveren
                    </button>
                  )}
                </>
              )}
            </div>
          </details>
        </div>
        <h1>{ticket.subject}</h1>
        <p className="hunch-description">{ticket.question}</p>
        <div className="hunch-byline">
          <span className="hunch-avatar berry">
            {initials(ticket.customer)}
          </span>
          <span>
            Geopend door <strong>{ticket.customer}</strong>
            {ticket.company && ` · ${ticket.company}`}
          </span>
          <span>·</span>
          <time dateTime={ticket.createdAt}>
            {dateLabel(ticket.createdAt, true)}
          </time>
          <span className="hunch-channel">
            {channels[ticket.intakeChannel]}
          </span>
        </div>
      </header>

      <section className="hunch-journey" aria-labelledby="hunch-timeline-title">
        <div className="hunch-section-heading">
          <div>
            <h2 id="hunch-timeline-title">Van vraag naar inzicht</h2>
            <p>Alle informatie, in de volgorde waarin ze binnenkomt.</p>
          </div>
          <span className="hunch-source-count">
            <FileText size={14} />
            {documents.length} {documents.length === 1 ? "bron" : "bronnen"}
          </span>
        </div>
        <ol className="case-thread hunch-activity">
          <li className="thread-item hunch-intake-entry">
            <span className="thread-avatar">
              <Mail size={15} />
            </span>
            <div className="agent-content">
              <div className="agent-heading">
                <strong>Vraag ontvangen</strong>
                <time dateTime={ticket.createdAt}>
                  {dateLabel(ticket.createdAt, true)} ·{" "}
                  {timeLabel(ticket.createdAt)}
                </time>
              </div>
              <p>
                {ticket.customer} · {channels[ticket.intakeChannel]}
              </p>
            </div>
          </li>
          {activity}
        </ol>
        {editable && (
          <div className="hunch-add-context">
            <button className="text-button" onClick={onUpload} disabled={busy}>
              <Plus size={15} /> Informatie toevoegen
            </button>
            <button
              className="text-button"
              onClick={() => setLinking(true)}
              disabled={busy}
            >
              <Link2 size={14} /> Hunch koppelen
            </button>
            <span>Nieuwe bronnen worden automatisch beoordeeld.</span>
          </div>
        )}
      </section>

      {(people.length > 0 || discussions.length > 0 || related.length > 0) && (
        <details className="hunch-connections">
          <summary>
            <Users size={16} />
            <strong>Gerelateerde kennis</strong>
            <span>
              {people.length} mensen · {discussions.length} gesprekken ·{" "}
              {related.length} Hunches
            </span>
            <ChevronDown size={15} />
          </summary>
          <div className="hunch-categories">
            {categories.map(({ key, title, count, Icon }) => (
              <button
                key={key}
                className={category === key ? "selected" : ""}
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
              >
                <Icon size={15} />
                <strong>{count}</strong>
                {title}
              </button>
            ))}
          </div>
          <div className="hunch-results">
            {category === "people" &&
              people.map((person) => (
                <button
                  className="hunch-resource"
                  key={person.author}
                  onClick={() => setDiscussion(person)}
                >
                  <span className="hunch-avatar berry">
                    {initials(person.author)}
                  </span>
                  <span className="hunch-resource-copy">
                    <strong>{person.author}</strong>
                    <small>Deelde informatie in {person.subject}</small>
                  </span>
                  <Score value={person.score} match />
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {category === "discussions" &&
              discussions.map((item) => (
                <button
                  className="hunch-resource"
                  key={item.id}
                  onClick={() => setDiscussion(item)}
                >
                  <MessageSquareText size={18} />
                  <span className="hunch-resource-copy">
                    <strong>{item.subject}</strong>
                    <small>
                      {item.author} · {dateLabel(item.createdAt, true)}
                    </small>
                  </span>
                  <Score value={item.score} match />
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {category === "hunches" &&
              related.map((item) => (
                <Link
                  className="hunch-resource"
                  href={`/hunches/${item.id}`}
                  key={item.id}
                >
                  <Link2 size={18} />
                  <span className="hunch-resource-copy">
                    <strong>{item.subject}</strong>
                    <small>
                      HNG-{String(item.number).padStart(4, "0")} ·{" "}
                      {
                        lifecycleLabels[
                          item.lifecycle as keyof typeof lifecycleLabels
                        ]
                      }
                    </small>
                  </span>
                  <Score value={item.score} match />
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            {!categories.find((item) => item.key === category)?.count && (
              <p className="hunch-empty">
                Nog geen passende{" "}
                {category === "people"
                  ? "mensen"
                  : category === "discussions"
                    ? "gesprekken"
                    : "Hunches"}{" "}
                gevonden.
              </p>
            )}
          </div>
          <p className="hunch-score-note">
            De matchscore meet gedeelde zoektermen, geen expertise of
            betrouwbaarheid.
          </p>
        </details>
      )}

      <details className="hunch-answer-section" ref={composer}>
        <summary>
          <MessageSquareText size={16} />
          <strong>Antwoord & notities</strong>
          <span>
            {dirty
              ? "Niet opgeslagen"
              : ticket.answer
                ? "Concept beschikbaar"
                : "Zelf aan de slag"}
          </span>
          <ChevronDown size={15} />
        </summary>
        {!editable && (
          <p className="hunch-readonly">
            <Archive size={15} />
            Heropen deze Hunch om verder te werken.
          </p>
        )}
        <fieldset className="hunch-composer-fieldset" disabled={!editable}>
          {children}
        </fieldset>
      </details>

      <section
        className="hunch-recommendation"
        aria-label="Aanbevolen volgende stap"
      >
        <div className="hunch-recommendation-main">
          <span className="hunch-pip">
            <HunchMark size={36} />
          </span>
          <div>
            <span className="hunch-overline">
              {!editable ? "BEWAARD VOOR LATER" : "AANBEVOLEN VOLGENDE STAP"}
            </span>
            <h2>{recommendation.title}</h2>
            <p>{recommendation.detail}</p>
          </div>
          {recommendation.href ? (
            <Link className="button primary" href={recommendation.href}>
              {recommendation.label}
              <ArrowRight size={15} />
            </Link>
          ) : (
            <button
              className="button primary"
              disabled={busy || !!active}
              onClick={recommendation.action}
            >
              {active ? <Spinner size={15} /> : null}
              {recommendation.label}
              {!active && <ArrowRight size={15} />}
            </button>
          )}
        </div>
        <div className="hunch-recommendation-footer">
          <span>
            <ShieldCheck size={14} />
            {ticket.completion
              ? `Hunch-score ${ticket.completion.score}/100`
              : `${scored.length} van ${documents.length} bronnen beoordeeld`}
          </span>
          {editable && (
            <button className="text-button" onClick={chooseAnswer}>
              Antwoord & notities
              <ArrowUpRight size={13} />
            </button>
          )}
          {ticket.completion && (
            <details>
              <summary>Hoe is de score opgebouwd?</summary>
              <p>
                60% gemiddelde bronscore ({ticket.completion.knowledgeScore}
                /100) + 40% antwoordcontrole ({ticket.completion.reviewScore}
                /100). Een goedgekeurde controle telt als 100; een controle met
                bezwaren als 50. Dit is een indicatie, geen garantie op
                juistheid.
              </p>
            </details>
          )}
        </div>
      </section>
      {discussion && (
        <Modal
          title={discussion.author}
          subtitle={`${discussion.subject} · ${dateLabel(discussion.createdAt)}`}
          onClose={() => setDiscussion(null)}
        >
          <Score value={discussion.score} match />
          <p className="hunch-match-explanation">
            Gedeelde zoektermen: {discussion.matchedTerms.join(", ")}. De score
            meet inhoudelijke overeenkomst met de vraag.
          </p>
          <div className="source-content">{discussion.content}</div>
          <Link
            className="button secondary"
            href={`/hunches/${discussion.ticketId}`}
          >
            Bijbehorende Hunch <ArrowUpRight size={15} />
          </Link>
        </Modal>
      )}
      {linking && (
        <Modal
          title="Koppel een gerelateerde Hunch"
          subtitle="Een momentopname van de vraag en het antwoord wordt toegevoegd en opnieuw beoordeeld."
          onClose={() => setLinking(false)}
        >
          <div className="hunch-link-options">
            {related.length ? (
              related.map((item) => {
                const linked = documents.some(
                  (doc) => doc.sourceTicketId === item.id,
                );
                return (
                  <button
                    key={item.id}
                    disabled={busy || linked}
                    onClick={() => {
                      onAction("link", { sourceId: item.id });
                      setLinking(false);
                    }}
                  >
                    <Link2 size={18} />
                    <span>
                      <strong>{item.subject}</strong>
                      <small>
                        {linked
                          ? "Al gekoppeld"
                          : `${item.score}% inhoudelijke match`}
                      </small>
                    </span>
                    <Plus size={16} />
                  </button>
                );
              })
            ) : (
              <div className="hunch-empty">
                <Link2 size={26} />
                <strong>Nog geen gerelateerde Hunches</strong>
                <p>
                  Andere Hunches met overlappende onderwerpen verschijnen hier
                  automatisch.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
function fileLabel(name: string) {
  return name.endsWith(".xlsx")
    ? "Excel"
    : name.endsWith(".pptx")
      ? "PowerPoint"
      : name.endsWith(".docx")
        ? "Word"
        : name.endsWith(".pdf")
          ? "PDF"
          : "Document";
}
function FileBadge({ doc }: { doc: DocumentView }) {
  const kind = fileLabel(doc.name.toLowerCase());
  const Icon = doc.sourceTicketId
    ? Link2
    : kind === "Excel"
      ? FileSpreadsheet
      : kind === "PowerPoint"
        ? Presentation
        : FileText;
  return (
    <span
      className={`hunch-file-icon ${kind === "PowerPoint" ? "coral" : doc.sourceTicketId ? "sun" : "teal"}`}
    >
      <Icon size={20} />
    </span>
  );
}
function Score({ value, match = false }: { value?: number; match?: boolean }) {
  return (
    <span
      className={`hunch-score ${value === undefined ? "pending" : value >= 75 ? "high" : value >= 45 ? "mid" : "low"}`}
    >
      {value === undefined ? (
        <>
          <Clock3 size={11} />
          Nog te beoordelen
        </>
      ) : (
        <>
          {value}% <small>{match ? "match" : "score"}</small>
        </>
      )}
    </span>
  );
}

export function HunchSourceEntry({
  doc,
  currentVersion,
  onClick,
}: {
  doc: DocumentView;
  currentVersion: number;
  onClick: () => void;
}) {
  const assessment =
    doc.assessedVersion === currentVersion ? doc.assessment : null;
  return (
    <li className="thread-item hunch-source-entry">
      <span className="thread-avatar hunch-source-dot">
        <FileText size={14} />
      </span>
      <div className="hunch-source-content">
        <div className="hunch-source-meta">
          <span>
            {doc.sourceTicketId
              ? "Hunch gekoppeld"
              : doc.origin === "knowledge"
                ? "Bron gevonden"
                : "Informatie ontvangen"}
          </span>
          <time dateTime={doc.createdAt}>
            {dateLabel(doc.createdAt, true)} · {timeLabel(doc.createdAt)}
          </time>
        </div>
        <button className="hunch-source-row" onClick={onClick}>
          <FileBadge doc={doc} />
          <span className="hunch-resource-copy">
            <strong>{doc.name}</strong>
            <small>
              {doc.kind}
              {doc.date ? ` · ${dateLabel(doc.date)}` : ""}
              {doc.fictional ? " · Demobron" : ""}
            </small>
            {assessment?.contradictions.length ? (
              <small className="hunch-conflict">
                Tegenstrijdigheid gevonden
              </small>
            ) : null}
          </span>
          <Score value={assessment?.score} />
          <ArrowUpRight size={14} />
        </button>
        {doc.sourceTicketId && (
          <Link
            className="hunch-linked-source"
            href={`/hunches/${doc.sourceTicketId}`}
          >
            Oorspronkelijke Hunch
            <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </li>
  );
}
