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
