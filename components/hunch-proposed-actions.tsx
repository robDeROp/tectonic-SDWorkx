"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { request } from "@/lib/client";
import type { HunchActionPlan, HunchDetail } from "@/lib/types";
import { ErrorNotice, Spinner } from "./ui";

export function HunchProposedActions({ hunch }: { hunch: HunchDetail }) {
  const [plan, setPlan] = useState<HunchActionPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const contextKey = JSON.stringify([
    hunch.id,
    hunch.updatedAt,
    hunch.context,
    hunch.relatedHunches,
    hunch.messages,
  ]);
  useEffect(() => {
    const current = ++generation.current;
    setPlan(null);
    setError("");
    setLoading(true);
    setBusy(false);
    request<{ plan: HunchActionPlan | null }>(
      `/api/hunches/${hunch.id}/proposals`,
    )
      .then((result) => {
        if (current === generation.current) setPlan(result.plan);
      })
      .catch((e) => {
        if (current === generation.current) setError(e.message);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [contextKey, hunch.id]);
  async function generate() {
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ plan: HunchActionPlan }>(
        `/api/hunches/${hunch.id}/proposals`,
        { method: "POST", body: "{}" },
      );
      if (current === generation.current) setPlan(result.plan);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <section
      className="panel proposed-actions"
      aria-label="Voorgestelde acties"
    >
      <div className="panel-head">
        <h2>
          <Sparkles size={20} /> Voorgestelde acties
        </h2>
        {plan && <span className="section-overline">Opgesteld met Gemini</span>}
      </div>
      <p className="panel-intro">
        Concrete volgende stappen op basis van de mensen, documenten, gesprekken
        en eerdere hunches bij je vraag.
      </p>
      {loading && (
        <p role="status">
          <Spinner /> Voorstellen laden…
        </p>
      )}
      {error && <ErrorNotice error={error} />}
      {!loading && !plan && (
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? <Spinner /> : <Sparkles size={16} />}
          {busy ? "Gemini stelt acties voor…" : "Acties voorstellen met Gemini"}
        </button>
      )}
      {plan && (
        <ol className="proposed-action-list">
          {plan.actions.map((action, index) => (
            <li key={index}>
              <span className="proposed-action-number">{index + 1}</span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.reason}</p>
                {action.person && (
                  <p className="proposed-contact">
                    {action.person.name}
                    {action.person.awayUntil &&
                      ` · Afwezig tot ${new Date(action.person.awayUntil).toLocaleDateString("nl-BE")}`}
                  </p>
                )}
                <details>
                  <summary>
                    Gebaseerd op {action.evidence.length}{" "}
                    {action.evidence.length === 1 ? "bron" : "bronnen"}
                  </summary>
                  {action.evidence.map((evidence, evidenceIndex) => {
                    const source = plan.sources.find(
                      (item) => item.id === evidence.sourceId,
                    )!;
                    return (
                      <div className="proposal-evidence" key={evidenceIndex}>
                        {source.href ? (
                          <Link href={source.href}>
                            {source.label} <ArrowUpRight size={14} />
                          </Link>
                        ) : (
                          <strong>{source.label}</strong>
                        )}
                        <blockquote>{evidence.quote}</blockquote>
                      </div>
                    );
                  })}
                </details>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="help-footnote">
        Jij kiest wat je doet. Deze voorstellen versturen geen berichten en
        wijzigen niets aan je hunch.
      </p>
    </section>
  );
}
