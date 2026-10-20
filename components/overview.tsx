"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Inbox,
  Mail,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { Modal } from "./ui";

type Activity = {
  id: string;
  time: string;
  title: string;
  project: string;
  tone: "phoenix" | "support" | "strategy";
  source: "word" | "docs" | "teams" | "mail";
  priority: "high" | "normal";
  action: "move" | "review" | "create";
  description: string;
  hunchTitle?: string;
};

type Hunch = {
  id: string;
  title: string;
  priority: Activity["priority"];
  members: string[];
  status: "working" | "input" | "review";
  description: string;
};

const initialActivities: Activity[] = [
  {
    id: "move-document",
    time: "10:22",
    title: "Document verplaatsen naar Teams",
    project: "Project Phoenix",
    tone: "phoenix",
    source: "word",
    priority: "high",
    action: "move",
    description:
      "Pip heeft het architectuurdocument herkend als onderdeel van Project Phoenix. Zet het op de juiste plek, zodat je team ermee verder kan.",
  },
  {
    id: "review-documents",
    time: "09:14",
    title: "5 documenten gevonden",
    project: "Klantenservice",
    tone: "support",
    source: "docs",
    priority: "normal",
    action: "review",
    description:
      "Pip heeft vijf documenten gevonden die je klantenservice kunnen helpen. Bekijk de inhoud voordat je ze als context gebruikt.",
  },
  {
    id: "meeting",
    time: "09:02",
    title: "Vergadering geanalyseerd",
    project: "Productstrategie",
    tone: "strategy",
    source: "teams",
    priority: "normal",
    action: "create",
    description:
      "De belangrijkste besluiten en open vragen uit het productoverleg staan klaar. Bundel ze in een Hunch om samen de volgende stap te zetten.",
    hunchTitle: "Vervolgacties productstrategie",
  },
  {
    id: "email",
    time: "08:45",
    title: "E-mailgesprek geanalyseerd",
    project: "Klantenservice",
    tone: "support",
    source: "mail",
    priority: "normal",
    action: "create",
    description:
      "Pip heeft terugkerende klantvragen uit het e-mailgesprek verzameld. Maak er een Hunch van om de opvolging met je team af te stemmen.",
    hunchTitle: "Opvolging klantvragen",
  },
  {
    id: "phoenix-standup",
    time: "08:32",
    title: "Actiepunten uit teamoverleg",
    project: "Project Phoenix",
    tone: "phoenix",
    source: "teams",
    priority: "high",
    action: "create",
    description:
      "Pip heeft de actiepunten uit de dagelijkse stand-up verzameld. Bundel de afspraken en open vragen in een Hunch om de opvolging met je team af te stemmen.",
    hunchTitle: "Actiepunten Project Phoenix",
  },
  {
    id: "customer-feedback",
    time: "08:18",
    title: "Nieuwe klantfeedback gebundeld",
    project: "Klantenservice",
    tone: "support",
    source: "mail",
    priority: "normal",
    action: "create",
    description:
      "Pip heeft feedback uit recente klantmails samengebracht. Maak een Hunch om de belangrijkste verbeterpunten met je collega's te bespreken.",
    hunchTitle: "Verbeterpunten uit klantfeedback",
  },
  {
    id: "roadmap-planning",
    time: "08:05",
    title: "Planningsoverleg samengevat",
    project: "Productstrategie",
    tone: "strategy",
    source: "teams",
    priority: "normal",
    action: "create",
    description:
      "De prioriteiten en afhankelijkheden uit het planningsoverleg staan klaar. Zet ze in een Hunch om samen de volgende productstappen te bepalen.",
    hunchTitle: "Prioriteiten voor de productplanning",
  },
];

const additionalActivities: Activity[] = [
  ["Klantoverleg samengevat", "Afspraken klantoverleg"],
  ["Open klantvragen verzameld", "Openstaande klantvragen"],
  ["Sprintbespreking geanalyseerd", "Vervolgacties sprintbespreking"],
  ["Overdracht per e-mail ontvangen", "Opvolging teamoverdracht"],
  ["Projectrisico's besproken", "Risico's en vervolgstappen"],
  ["Feedback op voorstel ontvangen", "Verwerking feedback voorstel"],
  ["Werkafspraken bijgewerkt", "Nieuwe werkafspraken"],
  ["Nieuwe aanvraag geanalyseerd", "Opvolging nieuwe aanvraag"],
  ["Kennissessie samengevat", "Inzichten uit de kennissessie"],
  ["Vragen over onboarding gebundeld", "Verbeteringen onboarding"],
  ["Teamprioriteiten afgestemd", "Prioriteiten voor deze week"],
  ["Klantbevestiging ontvangen", "Opvolging klantbevestiging"],
  ["Retrospectief geanalyseerd", "Verbeteracties uit het retrospectief"],
].map(([title, hunchTitle], index) => ({
  id: `extra-activity-${index + 1}`,
  time: `07:${String(55 - index * 4).padStart(2, "0")}`,
  title,
  hunchTitle,
  project: index % 2 === 0 ? "Productstrategie" : "Klantenservice",
  tone: index % 2 === 0 ? "strategy" : "support",
  source: index % 2 === 0 ? "teams" : "mail",
  priority: "normal",
  action: "create",
  description: `Pip heeft de context verzameld: ${title.toLowerCase()}. Bundel de inzichten en open vragen in een Hunch om samen de volgende stap te zetten.`,
}));

const activityPool = [...initialActivities, ...additionalActivities];
const pipStages = [
  { count: 1, image: "1-happy", label: "vrolijk" },
  { count: 3, image: "2-busy", label: "druk bezig" },
  { count: 6, image: "3-overworked", label: "overwerkt" },
  { count: 10, image: "4-overwhelmed", label: "overweldigd" },
  { count: 20, image: "5-drowning", label: "overspoeld" },
  { count: 0, image: "1-happy", label: "ontspannen" },
];

const initialHunches: Hunch[] = [
  {
    id: "assistant",
    title: "AI-assistent voor klantenservice",
    priority: "high",
    members: ["Jamie De Clercq", "Emma Jacobs", "Thomas Peeters"],
    status: "working",
    description:
      "Samen werken aan een AI-assistent die het team helpt om klantvragen met de juiste context te beantwoorden.",
  },
  {
    id: "phoenix",
    title: "Project Phoenix – Data-architectuur",
    priority: "normal",
    members: ["Emma Jacobs", "Jamie De Clercq"],
    status: "input",
    description:
      "De voorgestelde data-architectuur is klaar voor jouw input. Stem de open vragen af voordat het team verdergaat.",
  },
  {
    id: "knowledge",
    title: "Verbeteringen kennisbank",
    priority: "normal",
    members: ["Thomas Peeters", "Noah Willems"],
    status: "review",
    description:
      "De verbeteringen aan de kennisbank liggen ter beoordeling bij het team. Bekijk de voorgestelde structuur en inhoud.",
  },
];

const documents = [
  {
    title: "Handleiding klantenservice",
    content:
      "Begin met het vaststellen van de klantvraag. Verzamel relevante context en laat de voorgestelde oplossing controleren voordat je antwoordt.",
  },
  {
    title: "Veelgestelde klantvragen",
    content:
      "Klanten vragen regelmatig naar de status van hun aanvraag, benodigde documenten en de volgende stap. Geef per antwoord aan wat al bekend is en welke informatie nog ontbreekt.",
  },
  {
    title: "Werkafspraken supportteam",
    content:
      "Wijs iedere vraag toe aan een eigenaar. Bespreek ontbrekende informatie met de klant en draag complexe vragen met een korte samenvatting over aan een collega.",
  },
  {
    title: "Escalatieprocedure",
    content:
      "Leg bij een escalatie de aanleiding, impact en eerdere acties vast. Deel alleen de context die nodig is en spreek af wie de klant op de hoogte houdt.",
  },
  {
    title: "Checklist antwoordkwaliteit",
    content:
      "Controleer of het antwoord aansluit op de vraag, of bronnen actueel zijn en of onzekerheden duidelijk worden benoemd. Laat de verantwoordelijke medewerker het antwoord goedkeuren.",
  },
];

const actionLabels = {
  move: "Verplaatsen",
  review: "Beoordelen",
  create: "Hunch maken",
};
const statusLabels = {
  working: "In uitvoering",
  input: "Input nodig",
  review: "Ter beoordeling",
};
type DialogState =
  | { kind: "activity"; item: Activity; execute: boolean }
  | { kind: "hunch"; item: Hunch }
  | { kind: "all-activities" }
  | { kind: "all-hunches" };

export function Overview() {
  const [pipStageIndex, setPipStageIndex] = useState(0);
  const pipStage = pipStages[pipStageIndex];
  const nextPipStage = pipStages[(pipStageIndex + 1) % pipStages.length];
  const activities = activityPool.slice(0, pipStage.count);

  function cyclePip() {
    setPipStageIndex((current) => (current + 1) % pipStages.length);
    setCompleted([]);
    setFeedback("");
  }

  const [hunches, setHunches] = useState(initialHunches);
  const [completed, setCompleted] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [title, setTitle] = useState("");
  const [feedback, setFeedback] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  const hunchesSection = useRef<HTMLElement | null>(null);
  const hunchesHeading = useRef<HTMLHeadingElement | null>(null);

  function open(next: DialogState) {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (next.kind === "activity")
      setTitle(next.item.hunchTitle ?? next.item.title);
    setDialog(next);
  }

  function close() {
    setDialog(null);
    // Restore focus after React removes the native dialog.
    requestAnimationFrame(() => {
      const target = returnFocus.current;
      if (!target?.isConnected) {
        document
          .querySelector<HTMLElement>("#activity-title, #overview-guide-title")
          ?.focus({ preventScroll: true });
      } else {
        target?.focus();
      }
    });
  }

  function finish(item: Activity) {
    if (completed.includes(item.id)) return;
    if (item.action === "create") {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;
      setHunches((current) =>
        current.some((h) => h.id === item.id)
          ? current
          : [
              ...current,
              {
                id: item.id,
                title: cleanTitle,
                priority: "normal",
                members: ["Jamie De Clercq"],
                status: "working",
                description: item.description,
              },
            ],
      );
      setFeedback(
        `Je Hunch ‘${cleanTitle}’ staat klaar. Samen maken we de volgende stap helder.`,
      );
    } else {
      setFeedback(
        item.action === "move"
          ? "Het document is in deze demo verplaatst naar Project Phoenix. Alles op de juiste plek!"
          : "Je hebt de vijf voorbeelddocumenten beoordeeld. De context is klaar voor de volgende stap.",
      );
    }
    setCompleted((current) => [...current, item.id]);
    close();
  }

  const remainingActivities = activities.filter(
    (item) => !completed.includes(item.id),
  );
  const pending = remainingActivities.length;
  const hasCompleted = activities.some((item) => completed.includes(item.id));
  const isClear = pending === 0;
  const isLastAction = pending === 1;
  const isCompact = pending > 0 && pending <= 3;
  const mascotStage =
    [...pipStages]
      .reverse()
      .find((stage) => stage.count > 0 && pending >= stage.count) ??
    pipStages[0];
  const lastActivity = isLastAction ? remainingActivities[0] : null;
  const activeActivity = dialog?.kind === "activity" ? dialog.item : null;

  function scrollToHunches(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    hunchesHeading.current?.focus({ preventScroll: true });
    hunchesSection.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }

  return (
    <div className="page hunch-overview">
      <div className="page-heading overview-heading">
        <div>
          <div className="eyebrow">Jouw werkplek, met meer zekerheid</div>
          <h1>
            Welkom terug, Jamie{" "}
            <Sparkles
              className="overview-greeting"
              size={25}
              aria-hidden="true"
            />
          </h1>
          <p>Je dag in beeld. De volgende stap binnen handbereik.</p>
        </div>
        <Link href="/tickets" className="text-button overview-queue-link">
          <Inbox size={17} /> Maak een Hunch <ArrowRight size={16} />
        </Link>
      </div>

      <div
        className={`overview-split-card${isCompact ? " overview-compact-card" : ""}${isLastAction ? " overview-last-card" : ""}${isClear ? " overview-clear-card" : ""}${isClear && hasCompleted ? " is-celebrating" : ""}`}
      >
        {!isClear && (
          <section
            className="overview-activities"
            aria-labelledby="activity-title"
          >
            <div className="overview-card-heading">
              <h2 id="activity-title" tabIndex={-1}>
                {isLastAction ? "Je laatste actie" : "Activiteiten van de dag"}{" "}
                <span
                  className="overview-count"
                  aria-label={`${pending} openstaande activiteiten`}
                >
                  {pending}
                </span>
              </h2>
              <button
                className="text-button"
                onClick={() => open({ kind: "all-activities" })}
              >
                Alles bekijken <ChevronRight size={19} />
              </button>
            </div>
            {lastActivity ? (
              <article className="overview-final-activity">
                <div className="overview-final-meta">
                  <SourceIcon source={lastActivity.source} />
                  <span
                    className={`overview-project overview-project-${lastActivity.tone}`}
                  >
                    {lastActivity.project}
                  </span>
                  <time className="overview-time">{lastActivity.time}</time>
                </div>
                <h3>{lastActivity.title}</h3>
                <p>{lastActivity.description}</p>
                <div className="overview-final-actions">
                  <button
                    className="button overview-action"
                    onClick={() =>
                      open({
                        kind: "activity",
                        item: lastActivity,
                        execute: true,
                      })
                    }
                  >
                    {actionLabels[lastActivity.action]} <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      open({
                        kind: "activity",
                        item: lastActivity,
                        execute: false,
                      })
                    }
                  >
                    Context bekijken <ChevronRight size={17} />
                  </button>
                </div>
              </article>
            ) : (
              <ul className="overview-list overview-activity-list">
                {remainingActivities.map((item) => {
                  return (
                    <li key={item.id} className="overview-activity">
                      <time className="overview-time">{item.time}</time>
                      <Priority priority={item.priority} />
                      <SourceIcon source={item.source} />
                      <button
                        className="overview-row-title"
                        onClick={() =>
                          open({ kind: "activity", item, execute: false })
                        }
                      >
                        {item.title}
                      </button>
                      <span
                        className={`overview-project overview-project-${item.tone}`}
                      >
                        {item.project}
                      </span>
                      <button
                        className="button overview-action"
                        onClick={() =>
                          open({ kind: "activity", item, execute: true })
                        }
                      >
                        {actionLabels[item.action]}
                      </button>
                      <button
                        className="icon-button overview-more"
                        aria-label={`Meer opties voor ${item.title}`}
                        onClick={() =>
                          open({ kind: "activity", item, execute: false })
                        }
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="overview-guide" aria-label="Pip helpt je op weg">
          <button
            type="button"
            className="overview-mascot-stage"
            onClick={cyclePip}
            aria-label={`Pip is ${isClear ? "ontspannen" : mascotStage.label}. Toon ${nextPipStage.count} openstaande ${nextPipStage.count === 1 ? "activiteit" : "activiteiten"}.`}
          >
            <Image
              className="overview-mascot"
              src={`/hunch-mascot-${mascotStage.image}.png`}
              alt={`Pip, ${isClear ? "ontspannen" : mascotStage.label}`}
              width={1280}
              height={1280}
              sizes={
                isCompact
                  ? "(max-width: 760px) 160px, 220px"
                  : "(max-width: 760px) 260px, 360px"
              }
              preload
            />
            <span className="overview-guide-spark" aria-hidden="true">
              <Sparkles size={40} />
            </span>
          </button>
          <div className="overview-guide-copy">
            <span className="section-overline">
              {isClear ? (
                <>
                  <Check size={15} aria-hidden="true" />{" "}
                  {hasCompleted ? "Alles afgehandeld" : "Helemaal bij"}
                </>
              ) : isLastAction ? (
                "De laatste stap"
              ) : (
                "Pip denkt met je mee"
              )}
            </span>
            <h2 id="overview-guide-title" tabIndex={-1}>
              {isClear ? (
                hasCompleted ? (
                  <>
                    Goed gedaan, Jamie. <span>Je bent helemaal bij.</span>
                  </>
                ) : (
                  "Alles is rustig, Jamie."
                )
              ) : isLastAction ? (
                "Nog één actie. Je bent er bijna."
              ) : isCompact ? (
                hasCompleted ? (
                  "Goed bezig, Jamie."
                ) : (
                  "Nog een paar kleine stappen."
                )
              ) : (
                "Een helder begin van je dag."
              )}
            </h2>
            <p aria-live="polite" aria-atomic="true">
              {isClear
                ? hasCompleted
                  ? "Alle activiteiten zijn afgehandeld. Tijd om even adem te halen."
                  : "Je hebt op dit moment geen nieuwe activiteiten. Zodra er iets binnenkomt, zet ik het hier voor je klaar."
                : isLastAction
                  ? "De context staat klaar. Pak deze laatste actie op, dan ben je weer helemaal bij."
                  : isCompact
                    ? `Nog ${pending} acties, dan ben je weer helemaal bij. Eén stap tegelijk.`
                    : `Ik heb ${pending} activiteiten voor je klaargezet. Bekijk de context en kies je volgende stap.`}
            </p>
            {isClear && (
              <div className="overview-clear-actions">
                {hunches.length > 0 && (
                  <a
                    href="#open-hunches"
                    className="button overview-action"
                    onClick={scrollToHunches}
                  >
                    Bekijk je {hunches.length} open{" "}
                    {hunches.length === 1 ? "Hunch" : "Hunches"}{" "}
                    <ArrowDown size={17} />
                  </a>
                )}
                {hasCompleted && (
                  <button
                    className="text-button"
                    onClick={() => open({ kind: "all-activities" })}
                  >
                    Afgeronde activiteiten <ChevronRight size={17} />
                  </button>
                )}
              </div>
            )}
            <p
              className="overview-feedback"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {feedback}
            </p>
          </div>
        </section>
      </div>

      {hunches.length > 0 && (
        <section
          ref={hunchesSection}
          id="open-hunches"
          className="overview-card overview-hunches-card"
          aria-labelledby="hunches-title"
        >
          <div className="overview-card-heading">
            <h2 ref={hunchesHeading} id="hunches-title" tabIndex={-1}>
              Mijn Hunches{" "}
              <span className="overview-hunch-count">{hunches.length}</span>
            </h2>
            <button
              className="text-button"
              onClick={() => open({ kind: "all-hunches" })}
            >
              Alles bekijken <ChevronRight size={19} />
            </button>
          </div>
          <ul className="overview-list">
            {hunches.map((item) => (
              <li key={item.id} className="overview-hunch">
                <Priority priority={item.priority} />
                <button
                  className="overview-row-title"
                  onClick={() => open({ kind: "hunch", item })}
                >
                  {item.title}
                </button>
                <Members names={item.members} />
                <HunchStatus status={item.status} />
                <button
                  className="icon-button overview-more"
                  aria-label={`Meer opties voor ${item.title}`}
                  onClick={() => open({ kind: "hunch", item })}
                >
                  <MoreHorizontal size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="overview-footnote">
        <Sparkles size={15} aria-hidden="true" /> Find it. Understand it. Trust
        it.
      </div>

      {dialog && (
        <Modal
          title={
            dialog.kind === "activity"
              ? dialog.execute
                ? actionLabels[dialog.item.action]
                : dialog.item.title
              : dialog.kind === "hunch"
                ? dialog.item.title
                : dialog.kind === "all-activities"
                  ? "Alle activiteiten van vandaag"
                  : "Alle Hunches"
          }
          subtitle="Demo · Voorbeeldgegevens. Wijzigingen worden bij herladen teruggezet."
          onClose={close}
        >
          {activeActivity && (
            <>
              <div className="overview-detail-source">
                <SourceIcon source={activeActivity.source} />
                <span
                  className={`overview-project overview-project-${activeActivity.tone}`}
                >
                  {activeActivity.project}
                </span>
                <time>{activeActivity.time}</time>
              </div>
              <p className="overview-detail-copy">
                {activeActivity.description}
              </p>
              {completed.includes(activeActivity.id) ? (
                <div className="overview-completed-note">
                  <Check size={18} /> Deze activiteit is afgerond.
                </div>
              ) : dialog.kind === "activity" && dialog.execute ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    finish(activeActivity);
                  }}
                >
                  {activeActivity.action === "move" && (
                    <div className="overview-destination">
                      <span className="section-overline">Bestemming</span>
                      <strong>Teams / Project Phoenix / Documenten</strong>
                      <p>
                        Deze actie simuleert het verplaatsen van het
                        voorbeelddocument.
                      </p>
                    </div>
                  )}
                  {activeActivity.action === "review" && (
                    <div className="overview-documents">
                      {documents.map((doc, index) => (
                        <details key={doc.title}>
                          <summary>
                            <FileText size={18} />
                            <span>{doc.title}</span>
                          </summary>
                          <p>{doc.content}</p>
                          <small>
                            Voorbeelddocument {index + 1} van 5 · Fictieve
                            inhoud
                          </small>
                        </details>
                      ))}
                    </div>
                  )}
                  {activeActivity.action === "create" && (
                    <>
                      <label>
                        Naam van je Hunch
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                          maxLength={120}
                        />
                      </label>
                      <p>
                        Pip bundelt de context uit{" "}
                        {activeActivity.source === "teams"
                          ? "het overleg"
                          : "het e-mailgesprek"}{" "}
                        in je nieuwe demo-Hunch.
                      </p>
                    </>
                  )}
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={close}
                    >
                      Annuleren
                    </button>
                    <button
                      className="button overview-action"
                      type="submit"
                      disabled={
                        activeActivity.action === "create" && !title.trim()
                      }
                    >
                      {activeActivity.action === "move"
                        ? "Verplaatsen bevestigen"
                        : activeActivity.action === "review"
                          ? "Beoordeling afronden"
                          : "Hunch maken"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="modal-actions">
                  <button
                    className="button overview-action"
                    onClick={() =>
                      setDialog({
                        kind: "activity",
                        item: activeActivity,
                        execute: true,
                      })
                    }
                  >
                    {actionLabels[activeActivity.action]}{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {dialog.kind === "hunch" && (
            <>
              <div className="overview-detail-source">
                <HunchStatus status={dialog.item.status} />
                <Members names={dialog.item.members} />
              </div>
              <p className="overview-detail-copy">{dialog.item.description}</p>
              <div className="overview-destination">
                <span className="section-overline">Samen aan de slag</span>
                <p>
                  {dialog.item.status === "input"
                    ? "Deel je input over de open vragen met je team."
                    : dialog.item.status === "review"
                      ? "Neem de voorgestelde verbeteringen samen met je team door."
                      : "Het team verzamelt context en werkt aan de volgende stap."}
                </p>
              </div>
            </>
          )}
          {dialog.kind === "all-activities" &&
            (activities.length === 0 ? (
              <p className="overview-detail-copy">
                Je hebt op dit moment geen nieuwe activiteiten.
              </p>
            ) : (
              <ul className="overview-dialog-list">
                {activities.map((item) => (
                  <li key={item.id}>
                    <SourceIcon source={item.source} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.time} · {item.project}
                      </p>
                    </div>
                    <span className="overview-list-state">
                      {completed.includes(item.id) ? "Afgerond" : "Openstaand"}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          {dialog.kind === "all-hunches" && (
            <ul className="overview-dialog-list">
              {hunches.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.members.join(", ")}</p>
                  </div>
                  <HunchStatus status={item.status} />
                </li>
              ))}
            </ul>
          )}
          {(!activeActivity || completed.includes(activeActivity.id)) && (
            <div className="modal-actions">
              <button className="button secondary" onClick={close}>
                Sluiten
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Priority({
  priority,
  done = false,
}: {
  priority: Activity["priority"];
  done?: boolean;
}) {
  return (
    <span
      className={`overview-priority ${done ? "is-done" : priority}`}
      role="img"
      aria-label={
        done
          ? "Afgerond"
          : priority === "high"
            ? "Hoge prioriteit"
            : "Normale prioriteit"
      }
    >
      {done && <Check size={12} />}
    </span>
  );
}

function SourceIcon({ source }: { source: Activity["source"] }) {
  const labels = {
    word: "Word",
    docs: "Documenten",
    teams: "Teams",
    mail: "E-mail",
  };
  return (
    <span
      className={`overview-source overview-source-${source}`}
      role="img"
      aria-label={labels[source]}
    >
      {source === "word" ? (
        <span className="overview-word">W</span>
      ) : source === "docs" ? (
        <FileText size={23} />
      ) : source === "teams" ? (
        <Users size={23} />
      ) : (
        <Mail size={23} />
      )}
    </span>
  );
}

function Members({ names }: { names: string[] }) {
  return (
    <div className="overview-members" aria-label={`Team: ${names.join(", ")}`}>
      {names.map((name) => (
        <span
          key={name}
          className={`overview-member overview-member-${name.split(" ")[0].toLowerCase()}`}
          title={name}
          aria-hidden="true"
        >
          {name
            .split(" ")
            .filter(
              (_, index, parts) => index === 0 || index === parts.length - 1,
            )
            .map((part) => part[0])
            .join("")}
        </span>
      ))}
    </div>
  );
}

function HunchStatus({ status }: { status: Hunch["status"] }) {
  return (
    <span className={`overview-status overview-status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}
