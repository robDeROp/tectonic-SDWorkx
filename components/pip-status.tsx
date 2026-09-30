"use client";
import { useEffect, useRef, useState } from "react";
import { PipToast } from "./hunch";

type Phase = "hidden" | "working" | "found" | "leaving";

/**
 * Pip's pop-up, following the Hunch mascot rules:
 * - only appears when work runs longer than 400ms,
 * - narrates the step that is actually running,
 * - on success switches to "found", holds 1.2s, then pops out (300ms),
 * - never shows on errors: a failed job just pops out.
 */
export function PipStatus({
  activeId,
  step,
  outcomeOf,
}: {
  /** Id of the job that is queued or running, or null when idle. */
  activeId: string | null;
  /** Human label of the running step, e.g. "Kennisbank doorzoeken". */
  step: string | null;
  /** Looks up how a finished job ended and what to say about it. */
  outcomeOf: (id: string) => { done: boolean; message: string } | null;
}) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<"working" | "found">("working");
  const lastId = useRef<string | null>(null);
  const lookup = useRef(outcomeOf);
  useEffect(() => {
    lookup.current = outcomeOf;
  });

  useEffect(() => {
    if (activeId) {
      lastId.current = activeId;
      if (step) setMessage(step);
      if (phase === "working") return;
      setMood("working");
      const timer = setTimeout(() => setPhase("working"), 400);
      return () => clearTimeout(timer);
    }
    if (phase !== "working") return;
    const outcome = lastId.current ? lookup.current(lastId.current) : null;
    if (outcome?.done) {
      setMessage(outcome.message);
      setMood("found");
      setPhase("found");
    } else setPhase("leaving");
  }, [activeId, step, phase]);

  useEffect(() => {
    if (phase !== "found" && phase !== "leaving") return;
    const timer = setTimeout(
      () => setPhase(phase === "found" ? "leaving" : "hidden"),
      phase === "found" ? 1200 : 300,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;
  return (
    <div className="pip-dock">
      <PipToast state={mood} message={message} leaving={phase === "leaving"} />
    </div>
  );
}
