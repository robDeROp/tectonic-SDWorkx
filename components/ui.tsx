"use client";
import { useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  LoaderCircle,
  X,
} from "lucide-react";
import { statusLabel } from "@/lib/client";
import { HunchIcon } from "./hunch";
/* Every status pairs its colour with a glyph and a word. */
const statusGlyph: Record<string, React.ReactNode> = {
  working: <HunchIcon name="summary" size={13} />,
  open: <ArrowRight size={13} strokeWidth={2.5} />,
  attention: <AlertCircle size={13} strokeWidth={2.5} />,
  reviewed: <Check size={13} strokeWidth={2.5} />,
  sent: <CheckCheck size={13} strokeWidth={2.5} />,
};
export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      {statusGlyph[status] || <span className="status-dot" />}
      {statusLabel[status] || status}
    </span>
  );
}
export function Spinner({ size = 17 }: { size?: number }) {
  return <LoaderCircle size={size} className="spin" />;
}
export function ErrorNotice({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          Opnieuw proberen
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Sluiten" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
