"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Inbox,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { dateLabel, request } from "@/lib/client";
import type { TicketSummary } from "@/lib/types";
import { GlyphTile, HunchIcon, Pip } from "./hunch";
import { ErrorNotice, Modal, Spinner, Status } from "./ui";
export function TicketList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => {
    try {
      setTickets(await request("/api/tickets"));
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
  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (filter === "all" ||
            (filter === "open" ? t.status !== "sent" : t.status === filter)) &&
          `${t.subject} ${t.customer} ${t.company}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [tickets, query, filter],
  );
  const open = tickets.filter((t) => t.status !== "sent").length;
  return (
    <div className="page overview-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Your workspace, with more confidence</div>
          <h1>
            Welcome back, Jamie{" "}
            <span className="greeting-mark" aria-hidden="true">
              <HunchIcon name="summary" size={22} />
            </span>
          </h1>
          <p>Every customer question deserves an accurate answer.</p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          New customer question
        </button>
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="live-dot" /> Your knowledge assistant
          </span>
          <h2>
            From information
            <br />
            to <mark>confidence.</mark>
          </h2>
          <p>
            The right sources. A clear assessment. A stronger answer. <br />
            Hunch helps you at every step of a customer question.
          </p>
          <Link href="/kennisbank" className="hero-link">
            Explore the knowledge behind your answer
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <HeroArt />
      </section>
      <div className="stats-grid">
        <Stat
          title="Open questions"
          value={open}
          icon={<Inbox size={20} />}
          tone="neutral"
          detail="Ready to take on"
        />
        <Stat
          title="AI at work"
          value={tickets.filter((t) => t.status === "working").length}
          icon={<HunchIcon name="summary" size={20} />}
          tone="spark"
          detail="Gathering & assessing knowledge"
        />
        <Stat
          title="Needs your attention"
          value={tickets.filter((t) => t.status === "attention").length}
          icon={<AlertCircle size={20} />}
          tone="attention"
          detail="Your expertise makes the difference"
        />
        <Stat
          title="Completed"
          value={tickets.filter((t) => t.status === "sent").length}
          icon={<CheckCheck size={20} />}
          tone="success"
          detail="Answers checked"
        />
      </div>
      <section className="queue-section">
        <div className="section-title-row">
          <div>
            <h2>
              Customer questions{" "}
              <span className="count-badge">{tickets.length}</span>
            </h2>
            <p>From the first question to an answer backed by evidence.</p>
          </div>
          <span className="subtle-label">
            <span className="live-dot" />
            Live overview
          </span>
        </div>
        <div className="queue-toolbar">
          <div className="tabs">
            {[
              ["all", "All questions"],
              ["open", "Open"],
              ["sent", "Completed"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "tab selected" : "tab"}
                onClick={() => setFilter(key)}
              >
                {label}
                {key === "all" && <span>{tickets.length}</span>}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search customer questions"
              placeholder="Search for a customer question…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {error && <ErrorNotice error={error} onRetry={load} />}
        <div className="ticket-table">
          <div className="table-heading">
            <span>Customer question</span>
            <span>Customer</span>
            <span>Status</span>
            <span>
              Received <ArrowDown size={12} />
            </span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">
              <Spinner />
              Loading customer questions…
            </div>
          ) : filtered.length ? (
            filtered.map((t) => (
              <Link href={`/tickets/${t.id}`} className="ticket-row" key={t.id}>
                <div className="ticket-subject">
                  <GlyphTile kind="chats" size={40} />
                  <div>
                    <span className="ticket-number">
                      <span className="mono">
                        TKT-{String(t.number).padStart(4, "0")}
                      </span>
                      <span aria-hidden="true">·</span>
                      Payroll Belgium
                    </span>
                    <strong>{t.subject}</strong>
                    <span className="ticket-description">
                      {t.isDemo
                        ? "Final settlement, holiday entitlement and holiday certificate"
                        : t.question.slice(0, 65)}
                    </span>
                  </div>
                </div>
                <div className="customer-cell">
                  <span className="avatar">
                    {t.customer
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{t.customer}</strong>
                    <small>{t.company}</small>
                  </div>
                </div>
                <Status status={t.status} />
                <span className="date-cell">
                  {dateLabel(t.createdAt, true)}
                </span>
                <ArrowRight className="row-arrow" size={18} />
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <Pip state="idle" size={80} />
              <strong>Nothing found</strong>
              <span>Adjust your search or create a new customer question.</span>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            {filtered.length} of {tickets.length} customer questions
          </span>
          <span>Belgian payroll · Demo environment</span>
        </div>
      </section>
      <div className="workflow-explainer">
        <div className="workflow-intro">
          <span className="section-overline">How Hunch works</span>
          <h3>
            You stay in control. <br />
            AI helps you move forward.
          </h3>
        </div>
        {[
          {
            n: "01",
            icon: <GlyphTile kind="docs" />,
            title: "Find the right knowledge",
            text: "Relevant documents for your customer's question.",
          },
          {
            n: "02",
            icon: <GlyphTile kind="summary" />,
            title: "Understand what you can trust",
            text: "See sources, freshness and conflicts at a glance.",
          },
          {
            n: "03",
            icon: (
              <span className="workflow-check" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
            ),
            title: "Answer with confidence",
            text: "An extra check before you press send.",
          },
        ].map(({ n, icon, title, text }) => (
          <div className="workflow-item" key={n}>
            <span className="workflow-number">{n}</span>
            {icon}
            <h4>{title}</h4>
            <p>{text}</p>
          </div>
        ))}
      </div>
      {creating && (
        <NewTicket
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/tickets/${id}`)}
        />
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  icon,
  tone,
  detail,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "spark" | "attention" | "success";
  detail: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <span className={`stat-icon stat-${tone}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong>{value.toString().padStart(2, "0")}</strong>
      <small>{detail}</small>
    </div>
  );
}
function NewTicket({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="New customer question"
      subtitle="Hunch starts researching documents automatically."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            const result = await request<{ id: string }>("/api/tickets", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(form)),
            });
            onCreated(result.id);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Customer name
            <input
              name="customer"
              required
              minLength={2}
              maxLength={100}
              placeholder="Sophie De Smet"
            />
          </label>
          <label>
            Organisation
            <input
              name="company"
              required
              minLength={2}
              maxLength={120}
              placeholder="Atelier Noord"
            />
          </label>
        </div>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="naam@organisatie.be"
          />
        </label>
        <label>
          Subject
          <input
            name="subject"
            required
            minLength={3}
            maxLength={160}
            placeholder="What is the customer's question about?"
          />
        </label>
        <label>
          Customer question
          <textarea
            name="question"
            required
            minLength={10}
            maxLength={10000}
            rows={5}
            placeholder="Add the full customer question…"
          />
        </label>
        <div className="inline-info">
          <HunchIcon name="summary" size={16} />
          This demo uses three fictional sources about Belgian departure holiday
          pay.
        </div>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Plus size={17} />}Create customer question
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* Cover-style composition from the Hunch design system: the notched ticket
   slab, category blocks and sparks, with Pip standing on the cream ground. */
function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 360 260" preserveAspectRatio="xMinYMid slice">
        <rect
          className="art-coral"
          x="0"
          y="-24"
          width="120"
          height="200"
          rx="20"
        />
        <circle className="art-ground" cx="0" cy="88" r="13" />
        <circle className="art-ground" cx="120" cy="88" r="13" />
        <rect
          className="art-sun"
          x="0"
          y="192"
          width="72"
          height="28"
          rx="14"
        />
        <rect
          className="art-teal"
          x="232"
          y="16"
          width="84"
          height="60"
          rx="12"
        />
        <rect
          className="art-berry"
          x="328"
          y="16"
          width="110"
          height="60"
          rx="30"
        />
        <rect
          className="art-deep"
          x="232"
          y="92"
          width="200"
          height="190"
          rx="20"
        />
        <path className="art-sun" d={star(290, 168, 28)} />
        <path className="art-sun" d={star(336, 124, 10)} />
        <path className="art-sun" d={star(196, 40, 11)} />
        <g transform="translate(112 130)">
          <Pip state="idle" size={120} />
        </g>
      </svg>
    </div>
  );
}
const star = (x: number, y: number, s: number) =>
  `M${x},${y - s} Q${x},${y} ${x + s},${y} Q${x},${y} ${x},${y + s} Q${x},${y} ${x - s},${y} Q${x},${y} ${x},${y - s} Z`;
