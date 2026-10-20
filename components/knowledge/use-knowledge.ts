"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "@/lib/client";
import type { KnowledgeGraph } from "@/lib/types";
import { createModel, type Model } from "./model";

/* One request per page view, shared by every view that needs the graph. */
let cached: { at: number; promise: Promise<KnowledgeGraph> } | null = null;
const FRESH_MS = 15_000;
function fetchGraph(force = false) {
  if (force || !cached || Date.now() - cached.at > FRESH_MS) {
    const promise = request<KnowledgeGraph>("/api/knowledge");
    cached = { at: Date.now(), promise };
    promise.catch(() => (cached = null));
  }
  return cached.promise;
}

/** The kennisgraaf over the live data, as a ready-to-use model. */
export function useKnowledge(enabled = true) {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [error, setError] = useState("");
  const load = useCallback((force = false) => {
    setError("");
    fetchGraph(force).then(setGraph, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  const model: Model | null = useMemo(
    () => (graph ? createModel(graph) : null),
    [graph],
  );
  return { model, error, retry: () => load(true) };
}
