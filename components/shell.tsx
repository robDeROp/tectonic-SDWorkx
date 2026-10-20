"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  Lightbulb,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { HunchIcon, HunchLogo } from "./hunch";
import { HelpBell } from "./help-bell";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const nav = [
    {
      href: "/",
      label: "Hunches",
      icon: Lightbulb,
      active: path === "/" || path.startsWith("/hunches"),
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
          <strong>Een hunch is genoeg.</strong>
          <p>
            Hunch vindt de context.
            <br />
            Pip vindt de juiste collega.
            <br />
            Jij werkt gewoon verder.
          </p>
          <div className="note-rule" />
          <span>Find it. Trust it. Keep it trusted.</span>
        </div>
        <div className="sidebar-bottom">
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
              E-mails in demomodus
            </span>
            <HelpBell />
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
