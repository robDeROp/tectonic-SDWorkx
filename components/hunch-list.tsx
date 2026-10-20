"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Plus,
  Search,
  X,
} from "lucide-react";
import { dateLabel, hunchNumber, request } from "@/lib/client";
import { CURRENT_USER_ID, findEmployee } from "@/lib/directory";
import { contextView, findContext } from "@/lib/hunches";
import type { HunchSummary } from "@/lib/types";
import { GlyphTile, HunchIcon, Pip } from "./hunch";
import { HelpRequests } from "./help-requests";
import { SourceTag } from "./hunch-conversation";
import { Avatar, ErrorNotice, HunchStatus, Modal, Spinner } from "./ui";

type Lists = { all: HunchSummary[]; forYou: HunchSummary[] };
type Scope = "mine" | "help" | "all";
type StatusFilter = "any" | "open" | "resolved";
const PAGE_SIZE = 8;

export function HunchList() {
  const router = useRouter();
  const [lists, setLists] = useState<Lists>({ all: [], forYou: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("mine");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    try {
      setLists(await request("/api/hunches"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);
  const { all, forYou } = lists;
  const scoped: Record<Scope, HunchSummary[]> = useMemo(
    () => ({
      mine: all.filter((h) => h.author.id === CURRENT_USER_ID),
      help: forYou,
      all,
    }),
    [all, forYou],
  );
  const filtered = useMemo(
    () =>
      scoped[scope].filter(
        (h) =>
          (status === "any" ||
            (status === "open"
              ? h.status !== "resolved"
              : h.status === "resolved")) &&
          `${h.title} ${h.workingOn} ${h.author.name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [scoped, scope, query, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Live updates can shrink the list; never sit on a page that no longer exists.
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(
    current * PAGE_SIZE,
    (current + 1) * PAGE_SIZE,
  );
  const pick = (next: Scope) => {
    setScope(next);
    setPage(0);
  };
  const asks = forYou.filter((h) => h.status === "waiting");
  return (
    <div className="page overview-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Hunches</div>
          <h1>
            Welkom terug, Jamie{" "}
            <span className="greeting-mark" aria-hidden="true">
              <HunchIcon name="summary" size={22} />
            </span>
          </h1>
          <p>
            Waar loop je op vast? Hunch vindt de mensen, documenten en
            gesprekken die je verder helpen.
          </p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nieuwe hunch
        </button>
      </div>

      <HelpRequests
        asks={asks}
        onAccepted={(id) => router.push(`/hunches/${id}`)}
      />

      <section className="queue-section">
        <div className="queue-toolbar">
          <div className="tabs" role="tablist" aria-label="Welke hunches">
            {(
              [
                ["mine", "Van mij"],
                ["help", "Hulp gevraagd"],
                ["all", "Alle"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={scope === key}
                className={scope === key ? "tab selected" : "tab"}
                onClick={() => pick(key)}
              >
                {label}
                <span
                  className={key === "help" && asks.length ? "tab-alert" : ""}
                >
                  {scoped[key].length}
                </span>
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <select
              className="status-select"
              aria-label="Filter op status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(0);
              }}
            >
              <option value="any">Elke status</option>
              <option value="open">Lopend</option>
              <option value="resolved">Opgelost</option>
            </select>
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Zoek hunches"
                placeholder="Zoek een hunch of collega…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          </div>
        </div>
        {error && <ErrorNotice error={error} onRetry={load} />}
        <div className="ticket-table hunch-table">
          <div className="table-heading">
            <span>Hunch</span>
            <span>Geopend door</span>
            <span>Status</span>
            <span>Hulp van</span>
            <span>Laatst bijgewerkt</span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">
              <Spinner />
              Hunches laden…
            </div>
          ) : visible.length ? (
            visible.map((h) => (
              <Link href={`/hunches/${h.id}`} className="ticket-row" key={h.id}>
                <div className="ticket-subject">
                  <GlyphTile kind="summary" size={40} />
                  <div>
                    <span className="ticket-number">
                      <span className="mono">{hunchNumber(h.number)}</span>
                      <span aria-hidden="true">·</span>
                      {h.author.team}
                      <SourceTag source={h.source} compact />
                    </span>
                    <strong>{h.title}</strong>
                  </div>
                </div>
                <div className="customer-cell author-cell">
                  <Avatar person={h.author} small />
                  <span>
                    {h.author.id === CURRENT_USER_ID ? "Jij" : h.author.name}
                  </span>
                </div>
                <HunchStatus status={h.status} />
                <div className="customer-cell">
                  {h.helper ? (
                    <>
                      <Avatar person={h.helper} small />
                      <span>
                        {h.helper.id === CURRENT_USER_ID
                          ? "Jij"
                          : h.helper.name}
                      </span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
                <span className="date-cell">
                  {dateLabel(h.updatedAt, true)}
                </span>
                <ArrowRight className="row-arrow" size={18} />
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <Pip state="idle" size={80} />
              <strong>{EMPTY[scope].title}</strong>
              <span>
                {scoped[scope].length
                  ? "Pas je zoekopdracht of filter aan."
                  : EMPTY[scope].text}
              </span>
            </div>
          )}
        </div>
        {filtered.length > 0 && (
          <Pager
            page={current}
            pages={pages}
            total={filtered.length}
            onPage={setPage}
          />
        )}
      </section>
      {creating && (
        <NewHunch
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/hunches/${id}`)}
        />
      )}
    </div>
  );
}

const EMPTY: Record<Scope, { title: string; text: string }> = {
  mine: {
    title: "Nog geen hunches",
    text: "Open een hunch zodra je ergens op vastloopt.",
  },
  help: {
    title: "Niemand vraagt nu jouw hulp",
    text: "Pip laat het je weten zodra iemand je nodig heeft.",
  },
  all: { title: "Nog geen hunches", text: "Er zijn nog geen hunches." },
};

/** "1–8 van 14" with previous, page numbers and next. */
function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <nav className="table-footer pager" aria-label="Paginering">
      <span>
        {from}–{to} van {total}
      </span>
      {pages > 1 && (
        <div className="pager-buttons">
          <button
            className="icon-button"
            aria-label="Vorige pagina"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              className={i === page ? "page-number selected" : "page-number"}
              aria-current={i === page ? "page" : undefined}
              onClick={() => onPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="icon-button"
            aria-label="Volgende pagina"
            disabled={page === pages - 1}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}

function NewHunch({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [workingOn, setWorkingOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  /** "kind:id" keys of items the author left out of Hunch's suggestion. */
  const [excluded, setExcluded] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const text = `${title} ${workingOn}`.trim();
  // The same matching the server runs, live, so nothing is a surprise.
  const found = useMemo(
    () =>
      text.length >= 10
        ? contextView(
            findContext(text, findEmployee(CURRENT_USER_ID)!, excluded),
          )
        : null,
    [text, excluded],
  );
  const leaveOut = (key: string) => setExcluded((x) => [...x, key]);
  return (
    <Modal
      title="Nieuwe hunch"
      subtitle="Vertel waar je aan werkt. Hunch zoekt de mensen, documenten en gesprekken die je verder helpen."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await request<{ id: string }>("/api/hunches", {
              method: "POST",
              body: file
                ? multipart({ title, workingOn, exclude: excluded, file })
                : JSON.stringify({ title, workingOn, exclude: excluded }),
            });
            onCreated(result.id);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label>
          Je vraag in één zin
          <input
            name="title"
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hoe verwerk ik vertrekvakantiegeld bij deeltijds werk?"
          />
        </label>
        <label>
          Waar werk je aan?
          <textarea
            name="workingOn"
            required
            minLength={10}
            maxLength={5000}
            rows={4}
            value={workingOn}
            onChange={(e) => setWorkingOn(e.target.value)}
            placeholder="Ik bereid een eindafrekening voor en…"
          />
        </label>
        <div className="attach-field">
          {file ? (
            <span className="attach-chosen">
              <Paperclip size={15} />
              <strong>{file.name}</strong>
              <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
              <button
                type="button"
                className="icon-button"
                aria-label="Document verwijderen"
                onClick={() => setFile(null)}
              >
                <X size={15} />
              </button>
            </span>
          ) : (
            <label className="attach-pick">
              <Paperclip size={15} />
              Document toevoegen
              <small>Notities, Word, PDF of tekst · optioneel</small>
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
        <fieldset className="context-choice">
          <legend className="section-overline">Wat Hunch vindt</legend>
          {found ? (
            <>
              <div className="found-summary">
                <span className="avatar-stack" aria-hidden="true">
                  {found.people.slice(0, 4).map((p) => (
                    <Avatar key={p.id} person={p} small />
                  ))}
                </span>
                <span>
                  {found.people.length} mensen · {found.documents.length}{" "}
                  documenten · {found.conversations.length} gesprekken
                </span>
                <button
                  type="button"
                  className="text-button more-link"
                  aria-expanded={reviewing}
                  onClick={() => setReviewing((r) => !r)}
                >
                  {reviewing ? "Klaar" : "Bekijk en pas aan"}
                </button>
              </div>
              {reviewing && (
                <ul className="found-list">
                  {found.people.map((p) => (
                    <FoundItem
                      key={p.id}
                      icon={<Avatar person={p} small />}
                      name={p.name}
                      detail={p.signal ?? p.jobTitle}
                      onRemove={() => leaveOut(`person:${p.id}`)}
                    />
                  ))}
                  {found.documents.map((d) => (
                    <FoundItem
                      key={d.id}
                      icon={<GlyphTile kind="docs" size={32} />}
                      name={d.name}
                      detail={d.reason}
                      onRemove={() => leaveOut(`document:${d.id}`)}
                    />
                  ))}
                  {found.conversations.map((c) => (
                    <FoundItem
                      key={c.id}
                      icon={<GlyphTile kind="chats" size={32} />}
                      name={c.title}
                      detail={c.reason}
                      onRemove={() => leaveOut(`conversation:${c.id}`)}
                    />
                  ))}
                </ul>
              )}
              {!!excluded.length && (
                <button
                  type="button"
                  className="text-button more-link"
                  onClick={() => setExcluded([])}
                >
                  {excluded.length} weggelaten · herstel
                </button>
              )}
            </>
          ) : (
            <div className="inline-info">
              <HunchIcon name="summary" size={16} />
              Hunch zoekt relevante mensen, documenten en gesprekken zodra je
              beschrijft waar je aan werkt.
            </div>
          )}
        </fieldset>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Annuleren
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Plus size={17} />}Hunch openen
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FoundItem({
  icon,
  name,
  detail,
  onRemove,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
  onRemove: () => void;
}) {
  return (
    <li className="found-item">
      {icon}
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label={`${name} weglaten`}
        onClick={onRemove}
      >
        <X size={15} />
      </button>
    </li>
  );
}

function multipart(
  fields: Record<string, string | string[] | File | undefined>,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const v of Array.isArray(value) ? value : [value])
      if (v !== undefined) form.append(key, v);
  return form;
}
