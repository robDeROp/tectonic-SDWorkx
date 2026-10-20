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
    throw new Error("The server cannot be reached. Please try again.");
  }
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result as T;
}
export const dateLabel = (value: string | null, short = false) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: short ? "short" : "long",
        ...(!short ? { year: "numeric" as const } : {}),
      }).format(new Date(value))
    : "Date unknown";
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const statusLabel: Record<string, string> = {
  new: "New",
  working: "AI at work",
  open: "Ready to answer",
  attention: "Needs attention",
  sent: "Completed",
  reviewed: "Ready to send",
};
export const hunchStatusLabel: Record<string, string> = {
  open: "Context ready",
  waiting: "Waiting for help",
  helping: "Help on the way",
  resolved: "Resolved",
};
export const hunchNumber = (n: number) => `HUN-${String(n).padStart(4, "0")}`;
/** "12 min ago", "3 hr ago", then a plain date. */
export const agoLabel = (value: string) => {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - Date.parse(value)) / 60000),
  );
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr ago`;
  return dateLabel(value, true);
};
