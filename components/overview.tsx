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
    title: "Move document to Teams",
    project: "Project Phoenix",
    tone: "phoenix",
    source: "word",
    priority: "high",
    action: "move",
    description:
      "Pip recognised the architecture document as part of Project Phoenix. Put it in the right place so your team can move forward.",
  },
  {
    id: "review-documents",
    time: "09:14",
    title: "5 documents found",
    project: "Customer service",
    tone: "support",
    source: "docs",
    priority: "normal",
    action: "review",
    description:
      "Pip found five documents that could help your customer service team. Review their contents before using them as context.",
  },
  {
    id: "meeting",
    time: "09:02",
    title: "Meeting analysed",
    project: "Product strategy",
    tone: "strategy",
    source: "teams",
    priority: "normal",
    action: "create",
    description:
      "The key decisions and open questions from the product meeting are ready. Bring them together in a Hunch to take the next step together.",
    hunchTitle: "Product strategy next steps",
  },
  {
    id: "email",
    time: "08:45",
    title: "Email conversation analysed",
    project: "Customer service",
    tone: "support",
    source: "mail",
    priority: "normal",
    action: "create",
    description:
      "Pip collected recurring customer questions from the email conversation. Create a Hunch to coordinate follow-up with your team.",
    hunchTitle: "Customer question follow-up",
  },
  {
    id: "phoenix-standup",
    time: "08:32",
    title: "Action items from the team meeting",
    project: "Project Phoenix",
    tone: "phoenix",
    source: "teams",
    priority: "high",
    action: "create",
    description:
      "Pip collected the action items from the daily stand-up. Bring the decisions and open questions together in a Hunch to coordinate follow-up with your team.",
    hunchTitle: "Project Phoenix action items",
  },
  {
    id: "customer-feedback",
    time: "08:18",
    title: "New customer feedback collected",
    project: "Customer service",
    tone: "support",
    source: "mail",
    priority: "normal",
    action: "create",
    description:
      "Pip brought together feedback from recent customer emails. Create a Hunch to discuss the key improvements with your colleagues.",
    hunchTitle: "Improvements from customer feedback",
  },
  {
    id: "roadmap-planning",
    time: "08:05",
    title: "Planning meeting summarised",
    project: "Product strategy",
    tone: "strategy",
    source: "teams",
    priority: "normal",
    action: "create",
    description:
      "The priorities and dependencies from the planning meeting are ready. Put them in a Hunch to decide the next product steps together.",
    hunchTitle: "Product planning priorities",
  },
];

const additionalActivities: Activity[] = [
  ["Customer meeting summarised", "Customer meeting decisions"],
  ["Open customer questions collected", "Open customer questions"],
  ["Sprint meeting analysed", "Sprint meeting next steps"],
  ["Handover received by email", "Team handover follow-up"],
  ["Project risks discussed", "Risks and next steps"],
  ["Proposal feedback received", "Addressing proposal feedback"],
  ["Working agreements updated", "New working agreements"],
  ["New request analysed", "New request follow-up"],
  ["Knowledge session summarised", "Insights from the knowledge session"],
  ["Onboarding questions collected", "Onboarding improvements"],
  ["Team priorities agreed", "This week's priorities"],
  ["Customer confirmation received", "Customer confirmation follow-up"],
  ["Retrospective analysed", "Improvements from the retrospective"],
].map(([title, hunchTitle], index) => ({
  id: `extra-activity-${index + 1}`,
  time: `07:${String(55 - index * 4).padStart(2, "0")}`,
  title,
  hunchTitle,
  project: index % 2 === 0 ? "Product strategy" : "Customer service",
  tone: index % 2 === 0 ? "strategy" : "support",
  source: index % 2 === 0 ? "teams" : "mail",
  priority: "normal",
  action: "create",
  description: `Pip collected the context: ${title.toLowerCase()}. Bring the insights and open questions together in a Hunch to take the next step together.`,
}));

const activityPool = [...initialActivities, ...additionalActivities];
const pipStages = [
  { count: 1, image: "1-happy", label: "happy" },
  { count: 3, image: "2-busy", label: "busy" },
  { count: 6, image: "3-overworked", label: "overworked" },
  { count: 10, image: "4-overwhelmed", label: "overwhelmed" },
  { count: 20, image: "5-drowning", label: "swamped" },
  { count: 0, image: "1-happy", label: "relaxed" },
];

const initialHunches: Hunch[] = [
  {
    id: "assistant",
    title: "AI assistant for customer service",
    priority: "high",
    members: ["Jamie De Clercq", "Emma Jacobs", "Thomas Peeters"],
    status: "working",
    description:
      "Working together on an AI assistant that helps the team answer customer questions with the right context.",
  },
  {
    id: "phoenix",
    title: "Project Phoenix – Data architecture",
    priority: "normal",
    members: ["Emma Jacobs", "Jamie De Clercq"],
    status: "input",
    description:
      "The proposed data architecture is ready for your input. Resolve the open questions before the team moves forward.",
  },
  {
    id: "knowledge",
    title: "Knowledge base improvements",
    priority: "normal",
    members: ["Thomas Peeters", "Noah Willems"],
    status: "review",
    description:
      "The knowledge base improvements are ready for the team's review. Review the proposed structure and content.",
  },
];

const documents = [
  {
    title: "Customer service guide",
    content:
      "Start by identifying the customer's question. Gather relevant context and have the proposed solution checked before replying.",
  },
  {
    title: "Frequently asked customer questions",
    content:
      "Customers often ask about the status of their request, required documents and the next step. In each answer, explain what is known and what information is still missing.",
  },
  {
    title: "Support team working agreements",
    content:
      "Assign an owner to each question. Discuss missing information with the customer and hand complex questions over to a colleague with a brief summary.",
  },
  {
    title: "Escalation procedure",
    content:
      "When escalating, record the reason, impact and previous actions. Share only the necessary context and agree on who will keep the customer informed.",
  },
  {
    title: "Answer quality checklist",
    content:
      "Check that the answer addresses the question, the sources are current and uncertainties are clearly stated. Have the responsible colleague approve the answer.",
  },
];

const actionLabels = {
  move: "Move",
  review: "Review",
  create: "Create Hunch",
};
const statusLabels = {
  working: "In progress",
  input: "Input needed",
  review: "Awaiting review",
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
        `Your Hunch ‘${cleanTitle}’ is ready. Let's work out the next step together.`,
      );
    } else {
      setFeedback(
        item.action === "move"
          ? "The document has been moved to Project Phoenix in this demo. Everything in the right place!"
          : "You've reviewed the five sample documents. The context is ready for the next step.",
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
          <div className="eyebrow">Your workspace, with more confidence</div>
          <h1>
            Welcome back, Jamie{" "}
            <Sparkles
              className="overview-greeting"
              size={25}
              aria-hidden="true"
            />
          </h1>
          <p>Your day at a glance. Your next step within reach.</p>
        </div>
        <Link href="/tickets" className="text-button overview-queue-link">
          <Inbox size={17} /> Create a Hunch <ArrowRight size={16} />
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
                {isLastAction ? "Your latest action" : "Today's activities"}{" "}
                <span
                  className="overview-count"
                  aria-label={`${pending} open activities`}
                >
                  {pending}
                </span>
              </h2>
              <button
                className="text-button"
                onClick={() => open({ kind: "all-activities" })}
              >
                View all <ChevronRight size={19} />
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
                    View context <ChevronRight size={17} />
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
                        aria-label={`More options for ${item.title}`}
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

        <section
          className="overview-guide"
          aria-label="Pip helps you get started"
        >
          <button
            type="button"
            className="overview-mascot-stage"
            onClick={cyclePip}
            aria-label={`Pip is ${isClear ? "relaxed" : mascotStage.label}. Show ${nextPipStage.count} open ${nextPipStage.count === 1 ? "activity" : "activities"}.`}
          >
            <Image
              className="overview-mascot"
              src={`/hunch-mascot-${mascotStage.image}.png`}
              alt={`Pip, ${isClear ? "relaxed" : mascotStage.label}`}
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
                  {hasCompleted ? "All completed" : "All caught up"}
                </>
              ) : isLastAction ? (
                "The final step"
              ) : (
                "Pip is here to help"
              )}
            </span>
            <h2 id="overview-guide-title" tabIndex={-1}>
              {isClear ? (
                hasCompleted ? (
                  <>
                    Well done, Jamie. <span>You're all caught up.</span>
                  </>
                ) : (
                  "All is quiet, Jamie."
                )
              ) : isLastAction ? (
                "One action left. You're almost there."
              ) : isCompact ? (
                hasCompleted ? (
                  "You're doing well, Jamie."
                ) : (
                  "Just a few small steps left."
                )
              ) : (
                "A clear start to your day."
              )}
            </h2>
            <p aria-live="polite" aria-atomic="true">
              {isClear
                ? hasCompleted
                  ? "All activities are complete. Time to take a breather."
                  : "You have no new activities right now. As soon as something comes in, I'll have it ready for you here."
                : isLastAction
                  ? "The context is ready. Take care of this last action and you'll be all caught up."
                  : isCompact
                    ? `Just ${pending} more actions and you'll be all caught up. One step at a time.`
                    : `I've prepared ${pending} activities for you. Review the context and choose your next step.`}
            </p>
            {isClear && (
              <div className="overview-clear-actions">
                {hunches.length > 0 && (
                  <a
                    href="#open-hunches"
                    className="button overview-action"
                    onClick={scrollToHunches}
                  >
                    View your {hunches.length} open{" "}
                    {hunches.length === 1 ? "Hunch" : "Hunches"}{" "}
                    <ArrowDown size={17} />
                  </a>
                )}
                {hasCompleted && (
                  <button
                    className="text-button"
                    onClick={() => open({ kind: "all-activities" })}
                  >
                    Completed activities <ChevronRight size={17} />
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
              My Hunches{" "}
              <span className="overview-hunch-count">{hunches.length}</span>
            </h2>
            <button
              className="text-button"
              onClick={() => open({ kind: "all-hunches" })}
            >
              View all <ChevronRight size={19} />
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
                  aria-label={`More options for ${item.title}`}
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
                  ? "All of today's activities"
                  : "All Hunches"
          }
          subtitle="Demo · Sample data. Changes reset when you reload."
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
                  <Check size={18} /> This activity is complete.
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
                      <span className="section-overline">Destination</span>
                      <strong>Teams / Project Phoenix / Documents</strong>
                      <p>This action simulates moving the sample document.</p>
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
                            Sample document {index + 1} of 5 · Fictional content
                          </small>
                        </details>
                      ))}
                    </div>
                  )}
                  {activeActivity.action === "create" && (
                    <>
                      <label>
                        Name your Hunch
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                          maxLength={120}
                        />
                      </label>
                      <p>
                        Pip brings together the context from{" "}
                        {activeActivity.source === "teams"
                          ? "the meeting"
                          : "the email conversation"}{" "}
                        in your new demo Hunch.
                      </p>
                    </>
                  )}
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={close}
                    >
                      Cancel
                    </button>
                    <button
                      className="button overview-action"
                      type="submit"
                      disabled={
                        activeActivity.action === "create" && !title.trim()
                      }
                    >
                      {activeActivity.action === "move"
                        ? "Confirm move"
                        : activeActivity.action === "review"
                          ? "Complete review"
                          : "Create Hunch"}
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
                <span className="section-overline">Working together</span>
                <p>
                  {dialog.item.status === "input"
                    ? "Share your input on the open questions with your team."
                    : dialog.item.status === "review"
                      ? "Review the proposed improvements with your team."
                      : "The team is gathering context and working on the next step."}
                </p>
              </div>
            </>
          )}
          {dialog.kind === "all-activities" &&
            (activities.length === 0 ? (
              <p className="overview-detail-copy">
                You have no new activities right now.
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
                      {completed.includes(item.id) ? "Completed" : "Open"}
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
                Close
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
          ? "Completed"
          : priority === "high"
            ? "High priority"
            : "Normal priority"
      }
    >
      {done && <Check size={12} />}
    </span>
  );
}

function SourceIcon({ source }: { source: Activity["source"] }) {
  const labels = {
    word: "Word",
    docs: "Documents",
    teams: "Teams",
    mail: "Email",
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
