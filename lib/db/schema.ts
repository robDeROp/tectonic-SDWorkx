import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  serial,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { DocumentAssessment, JobInput, JobResult } from "../types";
const time = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  number: serial("number").notNull(),
  customer: text("customer").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  question: text("question").notNull(),
  status: text("status").notNull().default("new"),
  phase: text("phase").notNull().default("idle"),
  isDemo: boolean("is_demo").notNull().default(false),
  generation: integer("generation").notNull().default(1),
  documentVersion: integer("document_version").notNull().default(1),
  contextVersion: integer("context_version").notNull().default(0),
  answerVersion: integer("answer_version").notNull().default(0),
  answer: text("answer").notNull().default(""),
  error: text("error"),
  createdAt: time("created_at"),
  updatedAt: time("updated_at"),
});
export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    date: text("date"),
    content: text("content").notNull(),
    fictional: boolean("fictional").notNull().default(false),
    storageKey: text("storage_key"),
    assessment: jsonb("assessment").$type<DocumentAssessment>(),
    assessedVersion: integer("assessed_version"),
    createdAt: time("created_at"),
  },
  (t) => [index("documents_ticket_idx").on(t.ticketId)],
);
export const answers = pgTable(
  "answer_versions",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    generation: integer("generation").notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull(),
    createdAt: time("created_at"),
  },
  (t) => [
    uniqueIndex("answer_version_unique").on(
      t.ticketId,
      t.generation,
      t.version,
    ),
  ],
);
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    state: text("state").notNull().default("queued"),
    generation: integer("generation").notNull(),
    documentVersion: integer("document_version").notNull(),
    contextVersion: integer("context_version").notNull().default(0),
    answerVersion: integer("answer_version").notNull(),
    input: jsonb("input").$type<JobInput>().notNull(),
    result: jsonb("result").$type<JobResult>(),
    leaseToken: text("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    error: text("error"),
    dispatchError: text("dispatch_error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: time("created_at"),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("jobs_queue_idx").on(t.state, t.leaseUntil),
    index("jobs_ticket_idx").on(t.ticketId),
  ],
);
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    jobId: text("job_id"),
    label: text("label").notNull(),
    detail: text("detail"),
    tone: text("tone").notNull().default("info"),
    createdAt: time("created_at"),
  },
  (t) => [index("events_ticket_idx").on(t.ticketId)],
);
export const deliveries = pgTable(
  "deliveries",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => jobs.id),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    content: text("content").notNull(),
    overridden: boolean("overridden").notNull(),
    createdAt: time("created_at"),
  },
  (t) => [uniqueIndex("one_delivery_per_review").on(t.reviewId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    documentId: text("document_id"),
    createdAt: time("created_at"),
  },
  (t) => [index("messages_ticket_idx").on(t.ticketId)],
);

/* Hunches: an employee's question and everything Hunch linked to it. */
export const hunches = pgTable("hunches", {
  id: text("id").primaryKey(),
  number: serial("number").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  workingOn: text("working_on").notNull(),
  status: text("status").notNull().default("open"),
  /** Where the hunch was opened: the platform, or a Teams/Outlook plugin. */
  source: text("source").notNull().default("hunch"),
  /** Teams channel or mail subject the plugin was called from. */
  sourceLabel: text("source_label"),
  createdAt: time("created_at"),
  updatedAt: time("updated_at"),
});

/*
 * The people, documents and conversations linked directly to a hunch. Found
 * by Hunch when the hunch is opened; the author can leave items out first.
 */
export const hunchContext = pgTable(
  "hunch_context",
  {
    hunchId: text("hunch_id")
      .notNull()
      .references(() => hunches.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    relevance: integer("relevance").notNull(),
    reason: text("reason").notNull(),
  },
  (t) => [primaryKey({ columns: [t.hunchId, t.kind, t.refId] })],
);

/*
 * The hunch conversation. The first message is the author's description, or
 * the Teams/Outlook thread a plugin opened the hunch from. Senders outside
 * the directory (a customer mailing in) have no author id, only a name.
 */
export const hunchMessages = pgTable(
  "hunch_messages",
  {
    id: text("id").primaryKey(),
    hunchId: text("hunch_id")
      .notNull()
      .references(() => hunches.id, { onDelete: "cascade" }),
    authorId: text("author_id"),
    authorName: text("author_name").notNull(),
    authorDetail: text("author_detail"),
    source: text("source").notNull().default("hunch"),
    content: text("content").notNull(),
    attachmentName: text("attachment_name"),
    attachmentText: text("attachment_text"),
    createdAt: time("created_at"),
  },
  (t) => [index("hunch_messages_hunch_idx").on(t.hunchId, t.createdAt)],
);

/* Every routing step of a call for help, in order: skipped, notified, … */
export const helpCalls = pgTable(
  "help_calls",
  {
    id: text("id").primaryKey(),
    hunchId: text("hunch_id")
      .notNull()
      .references(() => hunches.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").notNull(),
    state: text("state").notNull(),
    note: text("note"),
    /** Simulated: no e-mail ever leaves the demo. */
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: time("created_at"),
  },
  (t) => [
    index("help_calls_hunch_idx").on(t.hunchId),
    index("help_calls_recipient_idx").on(t.recipientId, t.state),
  ],
);
