"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
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
            Welcome back, Jamie{" "}
            <span className="greeting-mark" aria-hidden="true">
              <HunchIcon name="summary" size={22} />
            </span>
          </h1>
          <p>
            What are you stuck on? Hunch finds the people, documents and
            conversations that help you move forward.
          </p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          New hunch
        </button>
      </div>

      <HelpRequests
        asks={asks}
        onAccepted={(id) => router.push(`/hunches/${id}`)}
      />

      <section className="queue-section">
        <div className="queue-toolbar">
          <div className="tabs" role="tablist" aria-label="Which hunches">
            {(
              [
                ["mine", "Mine"],
                ["help", "Help requested"],
                ["all", "All"],
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
            <span className="status-filter">
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter);
                  setPage(0);
                }}
              >
                <option value="any">Any status</option>
                <option value="open">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search hunches"
                placeholder="Search for a hunch or colleague…"
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
            <span>Opened by</span>
            <span>Status</span>
            <span>Help from</span>
            <span>Last updated</span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">
              <Spinner />
              Loading hunches…
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
                    {h.author.id === CURRENT_USER_ID ? "You" : h.author.name}
                  </span>
                </div>
                <HunchStatus status={h.status} />
                <div className="customer-cell">
                  {h.helper ? (
                    <>
                      <Avatar person={h.helper} small />
                      <span>
                        {h.helper.id === CURRENT_USER_ID
                          ? "You"
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
                  ? "Adjust your search or filter."
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
    title: "No hunches yet",
    text: "Open a hunch whenever you get stuck.",
  },
  help: {
    title: "No one needs your help right now",
    text: "Pip will let you know when someone needs you.",
  },
  all: { title: "No hunches yet", text: "There are no hunches yet." },
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
    <nav className="table-footer pager" aria-label="Pagination">
      <span>
        {from}–{to} of {total}
      </span>
      {pages > 1 && (
        <div className="pager-buttons">
          <button
            className="icon-button"
            aria-label="Previous page"
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
            aria-label="Next page"
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
      title="New hunch"
      subtitle="Tell us what you're working on. Hunch finds the people, documents and conversations that help you move forward."
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
          Your question in one sentence
          <input
            name="title"
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How do I handle departure holiday pay for part-time work?"
          />
        </label>
        <label>
          What are you working on?
          <textarea
            name="workingOn"
            required
            minLength={10}
            maxLength={5000}
            rows={4}
            value={workingOn}
            onChange={(e) => setWorkingOn(e.target.value)}
            placeholder="I'm preparing a final settlement and…"
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
                aria-label="Remove document"
                onClick={() => setFile(null)}
              >
                <X size={15} />
              </button>
            </span>
          ) : (
            <label className="attach-pick">
              <Paperclip size={15} />
              Add document
              <small>Notes, Word, PDF or text · optional</small>
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
        <fieldset className="context-choice">
          <legend className="section-overline">What Hunch finds</legend>
          {found ? (
            <>
              <div className="found-summary">
                <span className="avatar-stack" aria-hidden="true">
                  {found.people.slice(0, 4).map((p) => (
                    <Avatar key={p.id} person={p} small />
                  ))}
                </span>
                <span>
                  {found.people.length} people · {found.documents.length}{" "}
                  documents · {found.conversations.length} conversations
                </span>
                <button
                  type="button"
                  className="text-button more-link"
                  aria-expanded={reviewing}
                  onClick={() => setReviewing((r) => !r)}
                >
                  {reviewing ? "Done" : "Review and adjust"}
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
                  {excluded.length} omitted · restore
                </button>
              )}
            </>
          ) : (
            <div className="inline-info">
              <HunchIcon name="summary" size={16} />
              Hunch looks for relevant people, documents and conversations as
              soon as you describe what you're working on.
            </div>
          )}
        </fieldset>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Plus size={17} />}Open hunch
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
        aria-label={`${name} omit`}
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
