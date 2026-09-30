"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Inbox,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { dateLabel, request } from "@/lib/client";
import type { TicketSummary } from "@/lib/types";
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
          <div className="eyebrow">JOUW WERKPLEK, MET MEER ZEKERHEID</div>
          <h1>
            Welkom terug, Jamie <span className="greeting-mark">✳</span>
          </h1>
          <p>Elke klantvraag verdient een antwoord dat klopt.</p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}>
          <Plus size={18} />
          Nieuwe klantvraag
        </button>
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="live-dot" /> JE KENNISASSISTENT
          </span>
          <h2>
            Van informatie
            <br />
            naar <span>vertrouwen.</span>
          </h2>
          <p>
            De juiste bronnen. Een helder oordeel. Een sterker antwoord.
            <br />
            Clarity helpt je bij elke stap van de klantvraag.
          </p>
          <Link href="/kennisbank" className="hero-link">
            Ontdek de kennis achter je antwoord
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="trust-visual" aria-hidden="true">
          <div className="visual-grid" />
          <div className="floating-doc doc-one">
            <FileText size={19} />
            <div>
              <i />
              <i />
            </div>
            <span className="small-check">
              <Check size={12} />
            </span>
          </div>
          <div className="floating-doc doc-two">
            <FileText size={19} />
            <div>
              <i />
              <i />
            </div>
            <span className="small-check">
              <Check size={12} />
            </span>
          </div>
          <div className="connection-line" />
          <div className="trust-core">
            <ShieldCheck size={37} strokeWidth={1.6} />
          </div>
          <div className="verified-note">
            <span className="green-dot" />
            Onderbouwd met bronnen
          </div>
          <span className="visual-star star-one">✦</span>
          <span className="visual-star star-two">✦</span>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          title="Openstaande vragen"
          value={open}
          icon={<Inbox size={20} />}
          detail="Klaar om op te pakken"
        />
        <Stat
          title="AI aan het werk"
          value={tickets.filter((t) => t.status === "working").length}
          icon={<Sparkles size={20} />}
          detail="Kennis verzamelen & beoordelen"
        />
        <Stat
          title="Vraagt jouw aandacht"
          value={tickets.filter((t) => t.status === "attention").length}
          icon={<Clock3 size={20} />}
          detail="Jouw expertise maakt het verschil"
        />
        <Stat
          title="Afgehandeld"
          value={tickets.filter((t) => t.status === "sent").length}
          icon={<CheckCheck size={20} />}
          detail="Antwoorden gecontroleerd"
        />
      </div>
      <section className="queue-section">
        <div className="section-title-row">
          <div>
            <h2>
              Klantvragen <span className="count-badge">{tickets.length}</span>
            </h2>
            <p>Van de eerste vraag tot een onderbouwd antwoord.</p>
          </div>
          <span className="subtle-label">
            <span className="green-dot" />
            Live overzicht
          </span>
        </div>
        <div className="queue-toolbar">
          <div className="tabs">
            {[
              ["all", "Alle vragen"],
              ["open", "Openstaand"],
              ["sent", "Afgehandeld"],
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
              aria-label="Zoek klantvragen"
              placeholder="Zoek een klantvraag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span>⌕</span>
          </label>
        </div>
        {error && <ErrorNotice error={error} onRetry={load} />}
        <div className="ticket-table">
          <div className="table-heading">
            <span>Klantvraag</span>
            <span>Klant</span>
            <span>Status</span>
            <span>
              Ontvangen <ArrowDown size={12} />
            </span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">
              <Spinner />
              Klantvragen laden…
            </div>
          ) : filtered.length ? (
            filtered.map((t) => (
              <Link href={`/tickets/${t.id}`} className="ticket-row" key={t.id}>
                <div className="ticket-subject">
                  <span className="ticket-symbol">
                    <Inbox size={20} />
                  </span>
                  <div>
                    <span className="ticket-number">
                      TKT-{String(t.number).padStart(4, "0")} <span>·</span>{" "}
                      Payroll België
                    </span>
                    <strong>{t.subject}</strong>
                    <span className="ticket-description">
                      {t.isDemo
                        ? "Eindafrekening, vakantiedagen en vakantieattest"
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
              <Inbox size={24} />
              <strong>Geen klantvragen gevonden</strong>
              <span>
                Pas je zoekopdracht aan of maak een nieuwe klantvraag.
              </span>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            {filtered.length} van {tickets.length} klantvragen
          </span>
          <span>Belgische payroll · Demonstratieomgeving</span>
        </div>
      </section>
      <div className="workflow-explainer">
        <div className="workflow-intro">
          <span className="section-overline">ZO WERKT CLARITY</span>
          <h3>
            Jij houdt de regie.
            <br />
            AI helpt je vooruit.
          </h3>
        </div>
        {[
          {
            n: "01",
            icon: Search,
            title: "Vind de juiste kennis",
            text: "Relevante documenten bij jouw klantvraag.",
          },
          {
            n: "02",
            icon: ShieldCheck,
            title: "Begrijp wat je kunt vertrouwen",
            text: "Bronnen, actualiteit en conflicten in beeld.",
          },
          {
            n: "03",
            icon: CheckCheck,
            title: "Antwoord met zekerheid",
            text: "Een extra controle voor je op verzenden drukt.",
          },
        ].map(({ n, icon: Icon, title, text }) => (
          <div className="workflow-item" key={n}>
            <span className="workflow-number">{n}</span>
            <Icon size={19} />
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
  detail,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        {icon}
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
      title="Nieuwe klantvraag"
      subtitle="Clarity start het documentonderzoek automatisch."
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
            Klantnaam
            <input
              name="customer"
              required
              minLength={2}
              maxLength={100}
              placeholder="Sophie De Smet"
            />
          </label>
          <label>
            Organisatie
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
          E-mailadres
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="naam@organisatie.be"
          />
        </label>
        <label>
          Onderwerp
          <input
            name="subject"
            required
            minLength={3}
            maxLength={160}
            placeholder="Waar gaat de klantvraag over?"
          />
        </label>
        <label>
          Klantvraag
          <textarea
            name="question"
            required
            minLength={10}
            maxLength={10000}
            rows={5}
            placeholder="Voeg de volledige klantvraag toe…"
          />
        </label>
        <div className="inline-info">
          <Sparkles size={16} />
          Deze demo gebruikt drie fictieve bronnen over Belgisch
          vertrekvakantiegeld.
        </div>
        {error && <ErrorNotice error={error} />}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Annuleren
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Plus size={17} />}Klantvraag aanmaken
          </button>
        </div>
      </form>
    </Modal>
  );
}
