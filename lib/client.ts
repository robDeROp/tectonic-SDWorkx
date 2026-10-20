export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
    cache: "no-store",
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("De server is niet bereikbaar. Probeer opnieuw.");
  }
  if (!response.ok) throw new Error(result.error || "De aanvraag is mislukt.");
  return result as T;
}
export const dateLabel = (value: string | null, short = false) =>
  value
    ? new Intl.DateTimeFormat("nl-BE", {
        day: "numeric",
        month: short ? "short" : "long",
        ...(!short ? { year: "numeric" as const } : {}),
      }).format(new Date(value))
    : "Datum onbekend";
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const statusLabel: Record<string, string> = {
  new: "Nieuw",
  working: "AI aan het werk",
  open: "Klaar voor antwoord",
  attention: "Aandacht nodig",
  sent: "Afgehandeld",
  reviewed: "Klaar voor verzending",
};
export const hunchStatusLabel: Record<string, string> = {
  open: "Context klaar",
  waiting: "Wacht op hulp",
  helping: "Hulp onderweg",
  resolved: "Opgelost",
};
export const hunchNumber = (n: number) => `HUN-${String(n).padStart(4, "0")}`;
/** "12 min geleden", "3 uur geleden", then a plain date. */
export const agoLabel = (value: string) => {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - Date.parse(value)) / 60000),
  );
  if (minutes < 60) return `${minutes} min geleden`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} uur geleden`;
  return dateLabel(value, true);
};
