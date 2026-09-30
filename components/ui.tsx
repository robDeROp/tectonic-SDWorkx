"use client";
import { useEffect, useRef } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import { statusLabel } from "@/lib/client";
export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <span />
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
