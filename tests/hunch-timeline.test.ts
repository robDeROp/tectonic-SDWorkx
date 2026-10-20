import { describe, expect, it } from "vitest";
import { hunchTimeline } from "../lib/hunch-timeline";
import type {
  DocumentView,
  JobView,
  MessageView,
  TicketDetail,
} from "../lib/types";

const at = (minute: number) =>
  `2026-10-20T10:${String(minute).padStart(2, "0")}:00Z`;
const job = (
  id: string,
  minute: number,
  overrides: Partial<JobView> = {},
): JobView => ({
  id,
  createdAt: at(minute),
  kind: "documents",
  state: "done",
  generation: 1,
  documentVersion: 1,
  contextVersion: 0,
  answerVersion: 0,
  result: null,
  error: null,
  dispatchError: null,
  finishedAt: at(minute + 3),
  ...overrides,
});
const document = (id: string, minute: number): DocumentView => ({
  id,
  name: id,
  createdAt: at(minute),
  kind: "Intern",
  date: null,
  content: "",
  fictional: true,
  origin: "knowledge",
  sourceTicketId: null,
  assessment: null,
  assessedVersion: null,
});
const message = (id: string, minute: number): MessageView => ({
  id,
  createdAt: at(minute),
  author: "Collega",
  content: "Nieuwe context",
  kind: "email",
  documentId: "attachment",
});
const empty: Pick<
  TicketDetail,
  "jobs" | "events" | "documents" | "messages" | "deliveries"
> = {
  jobs: [],
  events: [],
  documents: [],
  messages: [],
  deliveries: [],
};

describe("chronological Hunch timeline", () => {
  it("shows incoming sources before assessment and interleaves later work by time", () => {
    const timeline = hunchTimeline({
      ...empty,
      // The API sends jobs newest first, but documents/messages oldest first.
      jobs: [
        job("review", 9, { kind: "review" }),
        job("second", 6),
        job("initial", 0),
      ],
      documents: [document("source", 1), document("attachment", 6)],
      messages: [message("email", 6)],
      events: [
        {
          id: "a1",
          jobId: "initial",
          label: "Betrouwbaarheid beoordelen",
          detail: null,
          tone: "info",
          createdAt: at(2),
        },
        {
          id: "a2",
          jobId: "second",
          label: "Betrouwbaarheid beoordelen",
          detail: null,
          tone: "info",
          createdAt: at(7),
        },
      ],
      deliveries: [
        {
          id: "sent",
          reviewId: "review",
          createdAt: at(13),
          recipient: "test@example.test",
          subject: "Antwoord",
          content: "Concept",
          overridden: false,
        },
      ],
    });
    expect(timeline.map((entry) => entry.id)).toEqual([
      "initial-search",
      "source",
      "initial-assess",
      "email",
      "attachment",
      "second-search",
      "second-assess",
      "review",
      "sent",
    ]);
    expect(timeline.find((entry) => entry.id === "initial-assess")?.at).toBe(
      at(2),
    );
  });

  it("does not claim assessment has begun while retrieval is running or failed", () => {
    for (const state of ["queued", "running", "failed", "obsolete"]) {
      const input = {
        ...empty,
        jobs: [job("search", 0, { state, finishedAt: null })],
      };
      expect(hunchTimeline(input).map((entry) => entry.id)).toEqual([
        "search-search",
      ]);
      input.events = [
        {
          id: "started",
          jobId: "search",
          label: "Betrouwbaarheid beoordelen",
          detail: null,
          tone: "info",
          createdAt: at(2),
        },
      ];
      expect(hunchTimeline(input).map((entry) => entry.id)).toEqual([
        "search-search",
        "search-assess",
      ]);
    }
  });

  it("uses completion time for older scored jobs without a start event", () => {
    const source = document("source", 1);
    const input = {
      ...empty,
      jobs: [job("older", 0)],
      documents: [source],
    };
    expect(hunchTimeline(input).map((entry) => entry.id)).toEqual([
      "older-search",
      "source",
      "older-assess",
    ]);
    expect(input.documents[0]).toBe(source);
    expect(hunchTimeline(input).at(-1)?.at).toBe(at(3));
  });
});
