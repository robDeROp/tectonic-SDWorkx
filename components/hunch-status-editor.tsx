"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hunchStatusLabel, request } from "@/lib/client";
import type {
  HunchDetail,
  HunchStatus as Status,
  PersonView,
} from "@/lib/types";
import { ErrorNotice, HunchStatus, Modal, Spinner } from "./ui";

export function HunchStatusEditor({
  hunch,
  onSaved,
}: {
  hunch: HunchDetail;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>(hunch.status);
  const [expected, setExpected] = useState<Status>(hunch.status);
  const [toId, setToId] = useState("");
  const [people, setPeople] = useState<PersonView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    request<PersonView[]>("/api/people")
      .then((rows) => {
        if (alive) setPeople(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [editing]);
  if (!hunch.viewer.isAuthor) return <HunchStatus status={hunch.status} />;
  const needsHelper = status === "waiting" || status === "helping";
  return (
    <>
      <button
        className="status-edit"
        aria-label={`Status wijzigen: ${hunchStatusLabel[hunch.status]}`}
        onClick={() => {
          setStatus(hunch.status);
          setExpected(hunch.status);
          setToId(hunch.helper?.id ?? "");
          setError("");
          setEditing(true);
        }}
      >
        <HunchStatus status={hunch.status} />
        <ChevronDown size={14} />
      </button>
      {editing && (
        <Modal
          title="Status wijzigen"
          subtitle="Werk de status en de betrokken collega bij."
          onClose={() => {
            if (!busy) setEditing(false);
          }}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                await request(`/api/hunches/${hunch.id}/status`, {
                  method: "POST",
                  body: JSON.stringify({
                    status,
                    expectedStatus: expected,
                    ...(needsHelper ? { toId } : {}),
                  }),
                });
                await onSaved();
                setEditing(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Status
              <select
                value={status}
                disabled={busy}
                onChange={(event) => setStatus(event.target.value as Status)}
              >
                {Object.entries(hunchStatusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {needsHelper && (
              <label>
                Betrokken collega
                <select
                  required
                  value={toId}
                  disabled={busy}
                  onChange={(event) => setToId(event.target.value)}
                >
                  <option value="">Kies een collega</option>
                  {people
                    .filter((p) => p.id !== hunch.author.id)
                    .map((p) => (
                      <option key={p.id} value={p.id} disabled={!!p.awayUntil}>
                        {p.name}
                        {p.awayUntil ? " · afwezig" : ""}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {status === "helping" && (
              <p className="panel-intro">
                Je legt vast dat deze collega helpt. Er wordt geen bericht
                verstuurd.
              </p>
            )}
            {(status === "open" || status === "resolved") && hunch.helper && (
              <p className="panel-intro">
                De lopende hulpvraag wordt afgesloten.
              </p>
            )}
            {error && <ErrorNotice error={error} />}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Annuleren
              </button>
              <button
                className="button primary"
                disabled={busy || (needsHelper && !toId)}
              >
                {busy && <Spinner />}Opslaan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
