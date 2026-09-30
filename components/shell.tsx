"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Inbox,
  Layers3,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Clarity startpagina">
          <span className="brand-icon">
            <Layers3 size={22} />
          </span>
          <span>
            clarity<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-logo">
            sd<span>worx</span>
          </span>
          <div>
            SD Worx<span>Payroll workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">WERKPLEK</div>
        <nav>
          <Link
            className={
              path === "/" || path.startsWith("/tickets")
                ? "nav-item active"
                : "nav-item"
            }
            href="/"
          >
            <Inbox size={19} />
            Klantvragen
            <span className="nav-dot" />
          </Link>
          <Link
            className={path === "/kennisbank" ? "nav-item active" : "nav-item"}
            href="/kennisbank"
          >
            <BookOpen size={19} />
            Kennisbank
          </Link>
          <Link
            className={
              path === "/instellingen" ? "nav-item active" : "nav-item"
            }
            href="/instellingen"
          >
            <Settings2 size={19} />
            Verbindingen
          </Link>
        </nav>
        <div className="sidebar-note">
          <div className="tiny-spark">
            <Sparkles size={16} />
          </div>
          <strong>Kennis wordt vertrouwen.</strong>
          <p>
            Vind de juiste bronnen.
            <br />
            Begrijp het verschil.
            <br />
            Antwoord met vertrouwen.
          </p>
          <div className="note-rule" />
          <span>
            Find it. Understand it. Trust it.
            <ArrowUpRight size={13} />
          </span>
        </div>
        <div className="sidebar-bottom">
          <div className="demo-label">
            <span />
            PROOF OF CONCEPT
          </div>
          <div className="profile">
            <span className="avatar avatar-dark">JD</span>
            <div>
              Jamie De Clercq<small>Payroll consultant · demo</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-context">
            <span className="context-symbol">◈</span> Customer care{" "}
            <span className="topbar-slash">/</span>
            <strong>Payroll België</strong>
          </div>
          <div className="topbar-right">
            <span className="safe-tag">
              <ShieldCheck size={14} />
              Verzending in demomodus
            </span>
            <Link
              href="/instellingen"
              className="icon-button"
              aria-label="Hulp en verbindingen"
            >
              <CircleHelp size={19} />
            </Link>
            <span className="avatar avatar-small">JD</span>
          </div>
        </header>
        <main>{children}</main>
        <footer className="page-footer">
          <span>Clarity · Een SD Worx proof of concept</span>
          <span>Gebouwd rond kennis. Ontworpen voor vertrouwen.</span>
        </footer>
      </div>
    </div>
  );
}
