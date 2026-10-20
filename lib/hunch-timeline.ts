import type {
  DeliveryView,
  DocumentView,
  JobView,
  MessageView,
  TicketDetail,
} from "./types";

type TimelineEntry = { id: string; at: string } & (
  | {
      kind: "job";
      job: JobView;
      stage: "search" | "assess" | "draft" | "review";
    }
  | { kind: "document"; document: DocumentView }
  | { kind: "message"; message: MessageView }
  | { kind: "delivery"; delivery: DeliveryView }
);

// Retrieval and assessment are separate moments in a single document job.
// Use the recorded assessment event so new sources precede their scoring.
export function hunchTimeline(
  data: Pick<
    TicketDetail,
    "jobs" | "events" | "documents" | "messages" | "deliveries"
  >,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const job of data.jobs) {
    if (job.kind === "documents") {
      entries.push({
        id: `${job.id}-search`,
        at: job.createdAt,
        kind: "job",
        job,
        stage: "search",
      });
      const assessment = data.events.find(
        (event) =>
          event.jobId === job.id &&
          event.label === "Betrouwbaarheid beoordelen",
      );
      if (assessment || job.state === "done") {
        entries.push({
          id: `${job.id}-assess`,
          at: assessment?.createdAt ?? job.finishedAt ?? job.createdAt,
          kind: "job",
          job,
          stage: "assess",
        });
      }
    } else if (job.kind === "draft" || job.kind === "review") {
      entries.push({
        id: job.id,
        at: job.createdAt,
        kind: "job",
        job,
        stage: job.kind,
      });
    }
  }
  for (const document of data.documents)
    entries.push({
      id: document.id,
      at: document.createdAt,
      kind: "document",
      document,
    });
  for (const message of data.messages)
    entries.push({
      id: message.id,
      at: message.createdAt,
      kind: "message",
      message,
    });
  for (const delivery of data.deliveries)
    entries.push({
      id: delivery.id,
      at: delivery.createdAt,
      kind: "delivery",
      delivery,
    });

  // PostgreSQL timestamps within one transaction can be identical. Keep an
  // incoming message and attachment before the job that assesses them.
  const rank = (entry: TimelineEntry) =>
    entry.kind === "message"
      ? 0
      : entry.kind === "document"
        ? 1
        : entry.kind === "job" && entry.stage === "search"
          ? 2
          : entry.kind === "job" && entry.stage === "assess"
            ? 3
            : 4;
  return entries.sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || rank(a) - rank(b),
  );
}
