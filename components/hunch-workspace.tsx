"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  Forward,
  HandHelping,
  Mail,
  Moon,
  Pencil,
  Shuffle,
  Undo2,
  UserRoundCheck,
} from "lucide-react";
import { dateLabel, hunchNumber, request, timeLabel } from "@/lib/client";
import type { HelpCallView, HunchDetail, PersonView } from "@/lib/types";
import { Pip, PipToast } from "./hunch";
import { HunchContext } from "./hunch-context";
import { HunchStatusEditor } from "./hunch-status-editor";
import { HunchProposedActions } from "./hunch-proposed-actions";
import { HunchConversation, SourceTag } from "./hunch-conversation";
import { Avatar, ErrorNotice, Modal, Spinner } from "./ui";

type Toast = { state: "working" | "found"; message: string; leaving?: boolean };
/** Which colleague picker is open: pass on, choose before sending, redirect. */
type Picking = "pass" | "choose" | "redirect" | null;

export function HunchWorkspace({ id }: { id: string }) {
  const [hunch, setHunch] = useState<HunchDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<Picking>(null);
  /** The author's own pick for the next call; null means Pip decides. */
  const [chosen, setChosen] = useState<PersonView | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const load = useCallback(async () => {
    try {
      setHunch(await request(`/api/hunches/${id}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    const pending = timers.current;
    return () => {
      clearInterval(timer);
      pending.forEach(clearTimeout);
    };
  }, [load]);

  /** Runs an action with Pip narrating it, following the mascot rules. */
  const act = async (
    action: string,
    working: string,
    done: (h: HunchDetail) => string,
    body?: object,
  ) => {
    setBusy(true);
    setError("");
    const show = setTimeout(
      () => setToast({ state: "working", message: working }),
      400,
    );
    try {
      await request(`/api/hunches/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      });
      const fresh = await request<HunchDetail>(`/api/hunches/${id}`);
      setHunch(fresh);
      clearTimeout(show);
      setToast({ state: "found", message: done(fresh) });
      timers.current.push(
        setTimeout(() => setToast((t) => t && { ...t, leaving: true }), 1600),
        setTimeout(() => setToast(null), 1900),
      );
    } catch (e) {
      clearTimeout(show);
      setToast(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!hunch)
    return error ? (
      <div className="page">
        <ErrorNotice error={error} onRetry={load} />
      </div>
    ) : (
      <div className="loading-page">
        <Spinner /> Loading hunch…
      </div>
    );

  return (
    <div className="page hunch-page">
      <Link href="/hunches" className="back-link">
        <ArrowLeft size={16} /> All hunches
      </Link>
      <header className="hunch-header">
        <div className="hunch-meta">
          <span className="mono">{hunchNumber(hunch.number)}</span>
          <HunchStatusEditor hunch={hunch} onSaved={load} />
          <SourceTag source={hunch.source} where={hunch.sourceLabel} />
        </div>
        <h1>{hunch.title}</h1>
        <div className="hunch-author">
          <Avatar person={hunch.author} small />
          <span>
            Opened by{" "}
            <strong>{hunch.viewer.isAuthor ? "you" : hunch.author.name}</strong>
            {!hunch.viewer.isAuthor &&
              ` · ${hunch.author.jobTitle}, ${hunch.author.team}`}{" "}
            · {dateLabel(hunch.createdAt, true)}
            {hunch.source !== "hunch" &&
              ` · via the ${hunch.source === "teams" ? "Teams" : "Outlook"}-plugin`}
          </span>
        </div>
      </header>
      {error && <ErrorNotice error={error} />}
      <div className="hunch-layout">
        <div className="hunch-main">
          <HunchConversation hunch={hunch} onSent={load} />
          <HunchContext
            context={hunch.context}
            hunches={hunch.relatedHunches}
            origin={{
              eyebrow: `Opened from ${hunchNumber(hunch.number)}`,
              title: hunch.title,
              kind: "hunch",
            }}
          />
        </div>
        <aside className="panel help-card" aria-label="Call for help">
          <HelpCard
            hunch={hunch}
            busy={busy}
            chosen={chosen}
            onHelp={() =>
              act(
                "help",
                chosen ? "Send help request" : "Finding the right colleague",
                (h) =>
                  h.helper
                    ? `${h.helper.name} has been notified`
                    : "Help request sent",
                { toId: chosen?.id },
              ).then(() => setChosen(null))
            }
            onChoose={() => setPicking("choose")}
            onRedirect={() => setPicking("redirect")}
            onCancel={() =>
              act(
                "cancel",
                "Withdraw help request",
                () => "Help request withdrawn",
              )
            }
            onVolunteer={() =>
              act(
                "volunteer",
                "Offer help",
                (h) => `${h.author.name.split(" ")[0]} knows you're helping`,
              )
            }
            onAccept={() =>
              act(
                "accept",
                "Take on help request",
                (h) => `${h.author.name.split(" ")[0]} knows you're helping`,
              )
            }
            onPass={() => setPicking("pass")}
            onResolve={() => act("resolve", "Close", () => "Hunch resolved")}
          />
          {!!hunch.calls.length && <Trail calls={hunch.calls} />}
        </aside>
      </div>
      <HunchProposedActions hunch={hunch} />
      {picking && (
        <PersonPicker
          hunch={hunch}
          mode={picking}
          onClose={() => setPicking(null)}
          onPick={(person, note) => {
            setPicking(null);
            if (picking === "choose") return setChosen(person);
            void act(
              picking === "pass" ? "pass" : "help",
              picking === "pass" ? "Pass on" : "Redirect",
              (h) =>
                h.helper
                  ? `${picking === "pass" ? "Passed on" : "Redirected"} to ${h.helper.name}`
                  : "Sent",
              { toId: person.id, note },
            );
          }}
        />
      )}
      {toast && (
        <div className="pip-dock">
          <PipToast
            state={toast.state}
            message={toast.message}
            leaving={toast.leaving}
          />
        </div>
      )}
    </div>
  );
}

/* The call-for-help card changes with who is looking and where the hunch is. */
function HelpCard({
  hunch,
  busy,
  chosen,
  onHelp,
  onChoose,
  onRedirect,
  onCancel,
  onVolunteer,
  onAccept,
  onPass,
  onResolve,
}: {
  hunch: HunchDetail;
  busy: boolean;
  chosen: PersonView | null;
  onHelp: () => void;
  onChoose: () => void;
  onRedirect: () => void;
  onCancel: () => void;
  onVolunteer: () => void;
  onAccept: () => void;
  onPass: () => void;
  onResolve: () => void;
}) {
  const { status, helper, viewer, author } = hunch;
  const first = (name: string) => name.split(" ")[0];
  const helperState = hunch.calls.at(-1)?.state;

  if (viewer.isHelper)
    return (
      <div className="help-state">
        <Pip state={helperState === "accepted" ? "found" : "idle"} size={96} />
        <h2>
          {helperState === "accepted"
            ? `You're helping ${first(author.name)}`
            : `${first(author.name)} is asking for your help`}
        </h2>
        <p>
          {helperState === "accepted"
            ? `${first(author.name)} knows you're taking this on. Get in touch via Teams or email.`
            : "Hunch sent this request to you. Take it on or pass it on."}
        </p>
        <div className="help-actions">
          {helperState !== "accepted" && (
            <button
              className="button primary"
              disabled={busy}
              onClick={onAccept}
            >
              <UserRoundCheck size={18} /> I'll take this on
            </button>
          )}
          <button
            className="button secondary"
            disabled={busy || hunch.passesLeft <= 0}
            onClick={onPass}
          >
            <Forward size={18} /> Pass on
          </button>
        </div>
        <small className="help-footnote">
          {hunch.passesLeft > 0
            ? `Can be passed on ${hunch.passesLeft} more ${hunch.passesLeft === 1 ? "time" : "times"}`
            : "This help request cannot be passed on again"}
        </small>
      </div>
    );

  if (status === "resolved")
    return (
      <div className="help-state">
        <Pip state="found" size={96} />
        <h2>Resolved</h2>
        <p>
          Glad you can move forward. This context stays available for colleagues
          to find.
        </p>
      </div>
    );

  if (status === "open" && !viewer.isAuthor)
    return (
      <div className="help-state">
        <Pip state="idle" size={96} />
        <h2>Do you know more about this?</h2>
        <p>
          {first(author.name)} hasn't asked for help yet. Take this on and{" "}
          {first(author.name)} will know right away that you're helping.
        </p>
        <button
          className="button primary"
          disabled={busy}
          onClick={onVolunteer}
        >
          <UserRoundCheck size={18} /> I'll take this on
        </button>
      </div>
    );

  if (status === "open") {
    const auto = hunch.context.people.find(
      (p) => p.id !== author.id && !p.awayUntil,
    );
    const next = chosen ?? auto;
    const away = hunch.context.people.filter(
      (p) =>
        p.id !== author.id &&
        p.awayUntil &&
        (p.relevance ?? 0) > (auto?.relevance ?? 0),
    );
    return (
      <div className="help-state">
        <Pip state="idle" size={96} />
        <h2>Need a hand?</h2>
        <p>
          Ask for help. Pip sends your question to the most relevant colleague
          who is available now.
        </p>
        <div className="next-up">
          {next ? (
            <>
              <Avatar person={next} small />
              <span>
                <strong>{next.name}</strong>
                <small>
                  {chosen
                    ? "Chosen by you"
                    : away.length
                      ? `${away.map((p) => first(p.name)).join(", ")} is away`
                      : next.signal}
                </small>
              </span>
            </>
          ) : (
            <span>
              <small>None of the people Hunch found are available.</small>
            </span>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={onChoose}
            aria-label="Choose who receives your help request"
          >
            <Pencil size={14} /> Change
          </button>
        </div>
        <button
          className="button primary"
          disabled={busy || !next}
          onClick={onHelp}
        >
          <HandHelping size={18} /> Ask for help
        </button>
      </div>
    );
  }

  return (
    <div className="help-state">
      <Pip state={status === "helping" ? "found" : "working"} size={96} />
      <h2>
        {status === "helping"
          ? `${helper ? first(helper.name) : "A colleague"} is helping you`
          : `${helper ? first(helper.name) : "A colleague"} has been notified`}
      </h2>
      <p>
        {!viewer.isAuthor
          ? "Pip is following up on this help request."
          : status === "helping"
            ? "You'll hear back soon via Teams or email."
            : "Pip will let you know when someone responds. You don't need to do anything."}
      </p>
      {viewer.isAuthor && (
        <div className="help-links">
          <button className="text-button" disabled={busy} onClick={onResolve}>
            <CheckCheck size={16} /> Resolved
          </button>
          <button className="text-button" disabled={busy} onClick={onRedirect}>
            <Shuffle size={16} /> Someone else
          </button>
          <button className="text-button" disabled={busy} onClick={onCancel}>
            <Undo2 size={16} /> Withdraw
          </button>
        </div>
      )}
    </div>
  );
}

/** The routing trail: who was considered, skipped, asked, and who passed it on. */
function Trail({ calls }: { calls: HelpCallView[] }) {
  return (
    <div className="help-trail">
      <span className="section-overline">History</span>
      <ol>
        {calls.map((c) => (
          <li key={c.id} className={`trail-${c.state}`}>
            <Avatar person={c.recipient} small />
            <span>
              <strong>{c.recipient.name}</strong>
              <small>
                {c.state === "skipped" ? (
                  <>
                    <Moon size={12} /> Away until{" "}
                    {c.note ? dateLabel(c.note, true) : "unknown"} · skipped
                  </>
                ) : c.state === "passed" ? (
                  <>
                    <Forward size={12} /> Passed on
                    {c.note ? `: “${c.note}”` : ""}
                  </>
                ) : c.state === "cancelled" ? (
                  <>
                    <Undo2 size={12} />{" "}
                    {c.note === "Redirected"
                      ? "Redirected to another colleague"
                      : "Help request withdrawn"}
                  </>
                ) : c.state === "accepted" ? (
                  <>
                    <UserRoundCheck size={12} /> {c.note ?? "Took it on"}
                  </>
                ) : (
                  <>
                    <Mail size={12} /> Email sent at{" "}
                    {timeLabel(c.emailedAt ?? c.createdAt)} · demo mode
                  </>
                )}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PICKER = {
  pass: {
    title: "Pass on help request",
    subtitle: "Choose who is better placed to answer this.",
    confirm: "Pass on",
  },
  choose: {
    title: "Who receives your help request?",
    subtitle:
      "Pip chooses the most relevant available colleague. You can choose someone else.",
    confirm: "Choose",
  },
  redirect: {
    title: "Redirect help request",
    subtitle:
      "Your help request will go to someone else. The current colleague will be released.",
    confirm: "Redirect",
  },
};

/**
 * Picks a colleague: the hunch's people first, everyone in the directory on
 * request. Out-of-office colleagues stay visible but cannot be picked.
 */
function PersonPicker({
  hunch,
  mode,
  onClose,
  onPick,
}: {
  hunch: HunchDetail;
  mode: Exclude<Picking, null>;
  onClose: () => void;
  onPick: (person: PersonView, note?: string) => void;
}) {
  const copy = PICKER[mode];
  const holder = hunch.helper?.id;
  const [everyone, setEveryone] = useState<PersonView[] | null>(null);
  const pool = (everyone ?? hunch.context.people).filter(
    (p) => p.id !== hunch.author.id && p.id !== holder,
  );
  const [toId, setToId] = useState(pool.find((p) => !p.awayUntil)?.id ?? "");
  const [note, setNote] = useState("");
  const person = pool.find((p) => p.id === toId);
  return (
    <Modal title={copy.title} subtitle={copy.subtitle} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (person) onPick(person, note.trim() || undefined);
        }}
      >
        <div className="pass-options picker-list" role="radiogroup">
          {pool.map((p) => (
            <label
              key={p.id}
              className={`pass-option${toId === p.id ? " selected" : ""}${p.awayUntil ? " disabled" : ""}`}
            >
              <input
                type="radio"
                name="toId"
                value={p.id}
                disabled={!!p.awayUntil}
                checked={toId === p.id}
                onChange={() => setToId(p.id)}
              />
              <Avatar person={p} small />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.awayUntil
                    ? `Away until ${dateLabel(p.awayUntil, true)}`
                    : (p.signal ?? `${p.jobTitle} · ${p.team}`)}
                </small>
              </span>
            </label>
          ))}
        </div>
        {!everyone && (
          <button
            type="button"
            className="text-button more-link"
            onClick={async () => {
              try {
                setEveryone(await request<PersonView[]>("/api/people"));
              } catch {
                /* Keep the hunch's people when the directory is unreachable. */
              }
            }}
          >
            Choose someone else in the organisation
          </button>
        )}
        {mode === "pass" && (
          <label>
            Brief explanation (optional)
            <input
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this colleague better placed to help?"
            />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!person || !!person.awayUntil}
          >
            {mode === "pass" ? <Forward size={17} /> : <Shuffle size={17} />}
            {copy.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}
