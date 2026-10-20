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
        <Spinner /> Hunch laden…
      </div>
    );

  return (
    <div className="page hunch-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Alle hunches
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
            Geopend door{" "}
            <strong>{hunch.viewer.isAuthor ? "jou" : hunch.author.name}</strong>
            {!hunch.viewer.isAuthor &&
              ` · ${hunch.author.jobTitle}, ${hunch.author.team}`}{" "}
            · {dateLabel(hunch.createdAt, true)}
            {hunch.source !== "hunch" &&
              ` · via de ${hunch.source === "teams" ? "Teams" : "Outlook"}-plugin`}
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
                chosen ? "Hulpvraag versturen" : "De juiste collega zoeken",
                (h) =>
                  h.helper
                    ? `${h.helper.name} is verwittigd`
                    : "Hulpvraag verstuurd",
                { toId: chosen?.id },
              ).then(() => setChosen(null))
            }
            onChoose={() => setPicking("choose")}
            onRedirect={() => setPicking("redirect")}
            onCancel={() =>
              act(
                "cancel",
                "Hulpvraag intrekken",
                () => "Hulpvraag ingetrokken",
              )
            }
            onVolunteer={() =>
              act(
                "volunteer",
                "Hulp aanbieden",
                (h) => `${h.author.name.split(" ")[0]} weet dat je helpt`,
              )
            }
            onAccept={() =>
              act(
                "accept",
                "Hulpvraag oppakken",
                (h) => `${h.author.name.split(" ")[0]} weet dat je helpt`,
              )
            }
            onPass={() => setPicking("pass")}
            onResolve={() =>
              act("resolve", "Afsluiten", () => "Hunch opgelost")
            }
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
              picking === "pass" ? "Doorgeven" : "Omleiden",
              (h) =>
                h.helper
                  ? `${picking === "pass" ? "Doorgegeven" : "Omgeleid"} naar ${h.helper.name}`
                  : "Verstuurd",
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
            ? `Je helpt ${first(author.name)}`
            : `${first(author.name)} vraagt jouw hulp`}
        </h2>
        <p>
          {helperState === "accepted"
            ? `${first(author.name)} weet dat je dit oppakt. Neem contact op via Teams of mail.`
            : "Hunch stuurde deze vraag naar jou. Pak hem op of geef hem door."}
        </p>
        <div className="help-actions">
          {helperState !== "accepted" && (
            <button
              className="button primary"
              disabled={busy}
              onClick={onAccept}
            >
              <UserRoundCheck size={18} /> Ik pak dit op
            </button>
          )}
          <button
            className="button secondary"
            disabled={busy || hunch.passesLeft <= 0}
            onClick={onPass}
          >
            <Forward size={18} /> Doorgeven
          </button>
        </div>
        <small className="help-footnote">
          {hunch.passesLeft > 0
            ? `Nog ${hunch.passesLeft}× door te geven`
            : "Deze hulpvraag kan niet meer worden doorgegeven"}
        </small>
      </div>
    );

  if (status === "resolved")
    return (
      <div className="help-state">
        <Pip state="found" size={96} />
        <h2>Opgelost</h2>
        <p>
          Fijn dat je verder kunt. Deze context blijft vindbaar voor
          collega&apos;s.
        </p>
      </div>
    );

  if (status === "open" && !viewer.isAuthor)
    return (
      <div className="help-state">
        <Pip state="idle" size={96} />
        <h2>Weet jij hier meer over?</h2>
        <p>
          {first(author.name)} heeft nog geen hulp ingeroepen. Pak het op en{" "}
          {first(author.name)} weet meteen dat jij helpt.
        </p>
        <button
          className="button primary"
          disabled={busy}
          onClick={onVolunteer}
        >
          <UserRoundCheck size={18} /> Ik pak dit op
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
        <h2>Kom je er niet uit?</h2>
        <p>
          Roep hulp in. Pip stuurt je vraag naar de meest relevante collega die
          nu beschikbaar is.
        </p>
        <div className="next-up">
          {next ? (
            <>
              <Avatar person={next} small />
              <span>
                <strong>{next.name}</strong>
                <small>
                  {chosen
                    ? "Zelf gekozen"
                    : away.length
                      ? `${away.map((p) => first(p.name)).join(", ")} is afwezig`
                      : next.signal}
                </small>
              </span>
            </>
          ) : (
            <span>
              <small>Niemand die Hunch vond, is beschikbaar.</small>
            </span>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={onChoose}
            aria-label="Kies zelf wie je hulpvraag krijgt"
          >
            <Pencil size={14} /> Wijzig
          </button>
        </div>
        <button
          className="button primary"
          disabled={busy || !next}
          onClick={onHelp}
        >
          <HandHelping size={18} /> Roep hulp in
        </button>
      </div>
    );
  }

  return (
    <div className="help-state">
      <Pip state={status === "helping" ? "found" : "working"} size={96} />
      <h2>
        {status === "helping"
          ? `${helper ? first(helper.name) : "Een collega"} helpt je verder`
          : `${helper ? first(helper.name) : "Een collega"} is verwittigd`}
      </h2>
      <p>
        {!viewer.isAuthor
          ? "Pip volgt deze hulpvraag op."
          : status === "helping"
            ? "Je hoort snel iets via Teams of mail."
            : "Pip laat je weten zodra er iemand reageert. Je hoeft niets te doen."}
      </p>
      {viewer.isAuthor && (
        <div className="help-links">
          <button className="text-button" disabled={busy} onClick={onResolve}>
            <CheckCheck size={16} /> Opgelost
          </button>
          <button className="text-button" disabled={busy} onClick={onRedirect}>
            <Shuffle size={16} /> Iemand anders
          </button>
          <button className="text-button" disabled={busy} onClick={onCancel}>
            <Undo2 size={16} /> Intrekken
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
      <span className="section-overline">Verloop</span>
      <ol>
        {calls.map((c) => (
          <li key={c.id} className={`trail-${c.state}`}>
            <Avatar person={c.recipient} small />
            <span>
              <strong>{c.recipient.name}</strong>
              <small>
                {c.state === "skipped" ? (
                  <>
                    <Moon size={12} /> Afwezig tot{" "}
                    {c.note ? dateLabel(c.note, true) : "onbekend"} ·
                    overgeslagen
                  </>
                ) : c.state === "passed" ? (
                  <>
                    <Forward size={12} /> Gaf door
                    {c.note ? `: “${c.note}”` : ""}
                  </>
                ) : c.state === "cancelled" ? (
                  <>
                    <Undo2 size={12} />{" "}
                    {c.note === "Omgeleid"
                      ? "Omgeleid naar een andere collega"
                      : "Hulpvraag ingetrokken"}
                  </>
                ) : c.state === "accepted" ? (
                  <>
                    <UserRoundCheck size={12} /> {c.note ?? "Pakte het op"}
                  </>
                ) : (
                  <>
                    <Mail size={12} /> E-mail verstuurd om{" "}
                    {timeLabel(c.emailedAt ?? c.createdAt)} · demomodus
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
    title: "Hulpvraag doorgeven",
    subtitle: "Kies wie dit beter kan beantwoorden.",
    confirm: "Doorgeven",
  },
  choose: {
    title: "Wie krijgt je hulpvraag?",
    subtitle:
      "Pip kiest de meest relevante beschikbare collega. Je mag zelf iemand anders kiezen.",
    confirm: "Kiezen",
  },
  redirect: {
    title: "Hulpvraag omleiden",
    subtitle:
      "Je hulpvraag gaat naar iemand anders. De huidige collega wordt vrijgegeven.",
    confirm: "Omleiden",
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
                    ? `Afwezig tot ${dateLabel(p.awayUntil, true)}`
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
            Iemand anders uit de organisatie kiezen
          </button>
        )}
        {mode === "pass" && (
          <label>
            Korte toelichting (optioneel)
            <input
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Waarom is deze collega beter geplaatst?"
            />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Annuleren
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
