"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  Inbox,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { HunchIcon, HunchLogo } from "./hunch";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const nav = [
    {
      href: "/",
      label: "Klantvragen",
      icon: Inbox,
      active: path === "/" || path.startsWith("/tickets"),
    },
    {
      href: "/kennisbank",
      label: "Kennisbank",
      icon: BookOpen,
      active: path === "/kennisbank",
    },
    {
      href: "/instellingen",
      label: "Verbindingen",
      icon: Settings2,
      active: path === "/instellingen",
    },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Hunch startpagina">
          <HunchLogo size={34} />
        </Link>
        <div className="workspace">
          <span className="workspace-logo" aria-hidden="true">
            SD
          </span>
          <div>
            SD Worx<span>Payroll workspace</span>
          </div>
          <ChevronDown size={16} />
        </div>
        <div className="nav-caption">Werkplek</div>
        <nav>
          {nav.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              className={active ? "nav-item active" : "nav-item"}
              aria-current={active ? "page" : undefined}
              href={href}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-spark">
            <HunchIcon name="summary" size={18} />
          </span>
          <strong>Kennis wordt vertrouwen.</strong>
          <p>
            Vind de juiste bronnen.
            <br />
            Begrijp het verschil.
            <br />
            Antwoord met vertrouwen.
          </p>
          <div className="note-rule" />
          <span>Find it. Understand it. Trust it.</span>
        </div>
        <div className="sidebar-bottom">
          <div className="demo-label">
            <span />
            Proof of concept
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
            Customer care <span className="topbar-slash">/</span>
            <strong>Payroll België</strong>
          </div>
          <div className="topbar-right">
            <span className="safe-tag">
              <ShieldCheck size={16} />
              Verzending in demomodus
            </span>
            <Link
              href="/instellingen"
              className="icon-button"
              aria-label="Hulp en verbindingen"
            >
              <CircleHelp size={20} />
            </Link>
            <span className="avatar avatar-small">JD</span>
          </div>
        </header>
        <main>{children}</main>
        <footer className="page-footer">
          <span>Hunch · Een SD Worx proof of concept</span>
          <span>Gebouwd rond kennis. Ontworpen voor vertrouwen.</span>
        </footer>
      </div>
    </div>
  );
}
