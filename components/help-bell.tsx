"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { hunchNumber, request, timeLabel } from "@/lib/client";
import type { HelpNotification } from "@/lib/types";
import { Pip } from "./hunch";
import { Avatar } from "./ui";

/** Calls for help addressed to you, the in-app side of the e-mail. */
export function HelpBell() {
  const path = usePathname();
  const [items, setItems] = useState<HelpNotification[]>([]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      setItems(await request("/api/notifications"));
    } catch {
      /* The bell stays quiet when the server is unreachable. */
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load, path]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="help-bell" ref={root}>
      <button
        className="icon-button"
        aria-label={`Hulpvragen voor jou: ${items.length}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {!!items.length && <span className="bell-count">{items.length}</span>}
      </button>
      {open && (
        <div className="bell-popover" role="dialog" aria-label="Hulpvragen">
          <strong className="bell-title">Hulpvragen voor jou</strong>
          {items.length ? (
            items.map((n) => (
              <Link
                key={n.hunchId}
                href={`/hunches/${n.hunchId}`}
                className="bell-item"
              >
                <Avatar person={n.from} small />
                <span>
                  <strong>{n.from.name} vraagt je hulp</strong>
                  <span>{n.title}</span>
                  <small>
                    {hunchNumber(n.number)} · {n.from.team} ·{" "}
                    {timeLabel(n.createdAt)}
                  </small>
                </span>
              </Link>
            ))
          ) : (
            <div className="bell-empty">
              <Pip state="idle" size={56} />
              Niemand wacht op je. Rustig.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
