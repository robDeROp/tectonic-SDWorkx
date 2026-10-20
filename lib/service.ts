import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, type Transaction } from "./db";
import {
  answers,
  deliveries,
  documents,
  events,
  jobs,
  messages,
  tickets,
} from "./db/schema";
import { aiConfiguration } from "./ai";
import { demoTicket, demoDocuments, colleagueEmail, DEMO_ID } from "./fixtures";
import { AppError } from "./errors";
import { dispatchJob } from "./dispatch";
import { removeFile } from "./storage";
import type { ReviewResult } from "./types";
export type Ticket = typeof tickets.$inferSelect;
export async function seed() {
  const [existing] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, DEMO_ID));
  if (!existing)
    await db.insert(tickets).values(demoTicket).onConflictDoNothing();
}
export async function lockTicket(tx: Transaction, id: string) {
  const [ticket] = await tx
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .for("update");
  if (!ticket) throw new AppError("This ticket does not exist.", 404);
  return ticket;
}
export async function addEvent(
  tx: Transaction,
  ticketId: string,
  label: string,
  detail?: string,
  tone = "info",
  jobId?: string,
) {
  await tx
    .insert(events)
    .values({ id: randomUUID(), ticketId, label, detail, tone, jobId });
}
export async function enqueue(tx: Transaction, ticket: Ticket, kind: string) {
  const sources = await tx
    .select()
    .from(documents)
    .where(eq(documents.ticketId, ticket.id))
    .orderBy(asc(documents.createdAt));
  const conversation = await tx
    .select()
    .from(messages)
    .where(eq(messages.ticketId, ticket.id))
    .orderBy(asc(messages.createdAt));
  const id = randomUUID();
  await tx.insert(jobs).values({
    id,
    ticketId: ticket.id,
    kind,
    generation: ticket.generation,
    documentVersion: ticket.documentVersion,
    contextVersion: ticket.contextVersion,
    answerVersion: ticket.answerVersion,
    input: {
      messages:
        kind === "documents"
          ? []
          : conversation.map(({ author, kind, content }) => ({
              author,
              kind,
              content,
            })),
      question: ticket.question,
      answer: ticket.answer,
      documents: sources.map(
        ({
          id,
          name,
          kind,
          date,
          content,
          fictional,
          assessment,
          assessedVersion,
        }) => ({
          id,
          name,
          kind,
          date,
          content,
          fictional,
          assessment:
            assessedVersion === ticket.documentVersion ? assessment : null,
        }),
      ),
    },
  });
  await tx
    .update(tickets)
    .set({
      phase:
        kind === "documents"
          ? "searching"
          : kind === "draft"
            ? "drafting"
            : "reviewing",
      status: "working",
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticket.id));
  await addEvent(
    tx,
    ticket.id,
    kind === "documents"
      ? "Document research scheduled"
      : kind === "draft"
        ? "AI draft requested"
        : "Answer review scheduled",
    undefined,
    "info",
    id,
  );
  return id;
}
export async function obsoleteJobs(tx: Transaction, ticketId: string) {
  await tx
    .update(jobs)
    .set({ state: "obsolete", finishedAt: new Date() })
    .where(
      and(
        eq(jobs.ticketId, ticketId),
        inArray(jobs.state, ["queued", "running"]),
      ),
    );
}
export async function listTickets() {
  await seed();
  return db.select().from(tickets).orderBy(desc(tickets.createdAt));
}
export async function getDetail(id: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) throw new AppError("This ticket does not exist.", 404);
  const [docs, runs, timeline, sent, conversation] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id))
      .orderBy(asc(documents.createdAt)),
    db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        state: jobs.state,
        generation: jobs.generation,
        documentVersion: jobs.documentVersion,
        contextVersion: jobs.contextVersion,
        answerVersion: jobs.answerVersion,
        result: jobs.result,
        error: jobs.error,
        dispatchError: jobs.dispatchError,
        createdAt: jobs.createdAt,
        finishedAt: jobs.finishedAt,
      })
      .from(jobs)
      .where(eq(jobs.ticketId, id))
      .orderBy(desc(jobs.createdAt)),
    db
      .select()
      .from(events)
      .where(eq(events.ticketId, id))
      .orderBy(asc(events.createdAt)),
    db
      .select()
      .from(deliveries)
      .where(eq(deliveries.ticketId, id))
      .orderBy(desc(deliveries.createdAt)),
    db
      .select()
      .from(messages)
      .where(eq(messages.ticketId, id))
      .orderBy(asc(messages.createdAt)),
  ]);
  return {
    ticket,
    documents: docs.map(({ storageKey: _key, ...d }) => d),
    jobs: runs,
    events: timeline,
    deliveries: sent,
    messages: conversation,
    ai: aiConfiguration(),
  };
}
export async function createTicket(data: {
  customer: string;
  company: string;
  email: string;
  subject: string;
  question: string;
}) {
  const id = randomUUID();
  const jobId = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({ id, ...data })
      .returning();
    await addEvent(
      tx,
      id,
      "Customer question received",
      `${data.customer} · ${data.company}`,
    );
    return enqueue(tx, ticket, "documents");
  });
  await dispatchJob(jobId);
  return id;
}
export async function startTicket(id: string) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.phase !== "idle") return null;
    await addEvent(
      tx,
      id,
      "Customer question received",
      `${ticket.customer} · ${ticket.company}`,
    );
    return enqueue(tx, ticket, "documents");
  });
  if (jobId) await dispatchJob(jobId);
}
export async function saveAnswer(
  id: string,
  content: string,
  expectedVersion: number,
) {
  return db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.answerVersion !== expectedVersion)
      throw new AppError(
        "The answer was changed elsewhere. Reload the ticket before continuing.",
        409,
      );
    if (ticket.answer === content)
      return { answerVersion: ticket.answerVersion };
    const version = ticket.answerVersion + 1;
    await tx.insert(answers).values({
      id: randomUUID(),
      ticketId: id,
      generation: ticket.generation,
      version,
      content,
      source: "human",
    });
    const [activeDocs] = await tx
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.ticketId, id),
          eq(jobs.kind, "documents"),
          inArray(jobs.state, ["queued", "running"]),
        ),
      );
    const sources = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    const sourcesReady =
      sources.length > 0 &&
      sources.every((d) => d.assessedVersion === ticket.documentVersion);
    await tx
      .update(jobs)
      .set({ state: "obsolete", finishedAt: new Date() })
      .where(
        and(
          eq(jobs.ticketId, id),
          inArray(jobs.kind, ["draft", "review"]),
          inArray(jobs.state, ["queued", "running"]),
        ),
      );
    await tx
      .update(tickets)
      .set({
        answer: content,
        answerVersion: version,
        updatedAt: new Date(),
        ...(!activeDocs && sourcesReady
          ? { phase: "ready", status: "open", error: null }
          : {}),
      })
      .where(eq(tickets.id, id));
    return { answerVersion: version };
  });
}
export async function addDocument(
  id: string,
  data: {
    name: string;
    content: string;
    kind: string;
    date: string | null;
    storageKey: string;
  },
) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const existing = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    const pendingFixtures = demoDocuments.filter(
      (fixture) =>
        !existing.some(
          (doc) => doc.id === `${id}-${ticket.generation}-${fixture.key}`,
        ),
    );
    if (
      existing.length + pendingFixtures.length >= 15 ||
      [...existing, ...pendingFixtures].reduce(
        (n, d) => n + d.content.length,
        0,
      ) +
        data.content.length >
        300000
    )
      throw new AppError(
        "The demo supports up to 15 documents and 300,000 characters per ticket.",
      );
    await obsoleteJobs(tx, id);
    await tx
      .insert(documents)
      .values({ id: randomUUID(), ticketId: id, ...data });
    const version = ticket.documentVersion + 1;
    await tx
      .update(tickets)
      .set({ documentVersion: version })
      .where(eq(tickets.id, id));
    await addEvent(
      tx,
      id,
      "Additional document added",
      `${data.name} · previous reviews are no longer valid`,
    );
    return enqueue(tx, { ...ticket, documentVersion: version }, "documents");
  });
  await dispatchJob(jobId);
}
export async function requestAI(
  id: string,
  kind: "draft" | "review",
  expectedVersion: number,
) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.answerVersion !== expectedVersion)
      throw new AppError(
        "The answer has changed. Save the current text and try again.",
        409,
      );
    const [active] = await tx
      .select()
      .from(jobs)
      .where(
        and(eq(jobs.ticketId, id), inArray(jobs.state, ["queued", "running"])),
      );
    if (active) {
      if (active.kind === kind) return active.id;
      throw new AppError("Wait for the current processing to finish.", 409);
    }
    const docs = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    if (
      !docs.length ||
      docs.some((d) => d.assessedVersion !== ticket.documentVersion)
    )
      throw new AppError("Have the current documents assessed first.", 409);
    if (kind === "review" && !ticket.answer.trim())
      throw new AppError("Write an answer first.");
    const [previous] = await tx
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.ticketId, id),
          eq(jobs.kind, kind),
          eq(jobs.generation, ticket.generation),
          eq(jobs.documentVersion, ticket.documentVersion),
          eq(jobs.contextVersion, ticket.contextVersion),
          eq(jobs.answerVersion, ticket.answerVersion),
          eq(jobs.state, "done"),
        ),
      )
      .orderBy(desc(jobs.createdAt));
    if (kind === "review" && previous) return previous.id;
    return enqueue(tx, ticket, kind);
  });
  await dispatchJob(jobId);
  return jobId;
}
export async function recordDelivery(
  tx: Transaction,
  ticket: Ticket,
  reviewId: string,
  override: boolean,
) {
  await tx
    .insert(deliveries)
    .values({
      id: randomUUID(),
      ticketId: ticket.id,
      reviewId,
      recipient: ticket.email,
      subject: `Re: ${ticket.subject}`,
      content: ticket.answer,
      overridden: override,
    })
    .onConflictDoNothing();
  await tx
    .update(tickets)
    .set({ status: "sent", phase: "sent", error: null, updatedAt: new Date() })
    .where(eq(tickets.id, ticket.id));
  await addEvent(
    tx,
    ticket.id,
    "Sending simulated",
    `${ticket.email}${override ? " · AI concerns manually overridden by demo employee" : " · answer approved"}`,
    "success",
    reviewId,
  );
}
export async function sendReviewedAnswer(
  id: string,
  reviewId: string,
  override = false,
) {
  await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const [review] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, reviewId), eq(jobs.ticketId, id)));
    if (
      !review ||
      review.kind !== "review" ||
      review.state !== "done" ||
      (review.result as ReviewResult)?.verdict !==
        (override ? "changes_requested" : "approved") ||
      review.contextVersion !== ticket.contextVersion ||
      review.generation !== ticket.generation ||
      review.answerVersion !== ticket.answerVersion ||
      review.documentVersion !== ticket.documentVersion
    )
      throw new AppError(
        "This review is incomplete or no longer current.",
        409,
      );
    const [already] = await tx
      .select()
      .from(deliveries)
      .where(eq(deliveries.reviewId, reviewId));
    if (!already) await recordDelivery(tx, ticket, reviewId, override);
  });
}
export async function overrideReview(id: string, reviewId: string) {
  return sendReviewedAnswer(id, reviewId, true);
}
export async function retryTicket(id: string) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const [last] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.ticketId, id))
      .orderBy(desc(jobs.createdAt));
    if (!last) return enqueue(tx, ticket, "documents");
    if (last.state === "queued") return last.id;
    if (last.state === "running") {
      if (last.leaseUntil && last.leaseUntil.getTime() > Date.now())
        throw new AppError("Processing is still in progress.", 409);
      await tx
        .update(jobs)
        .set({ state: "queued", leaseToken: null, leaseUntil: null })
        .where(eq(jobs.id, last.id));
      return last.id;
    }
    if (last.state !== "failed")
      throw new AppError("There is no failed task to retry.", 409);
    return enqueue(tx, ticket, last.kind);
  });
  await dispatchJob(jobId);
}
export async function resetDemo(id: string) {
  if (id !== DEMO_ID)
    throw new AppError("Only the original demo ticket can be replayed.");
  const { jobId, files } = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const docs = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    await tx.delete(deliveries).where(eq(deliveries.ticketId, id));
    await tx.delete(jobs).where(eq(jobs.ticketId, id));
    await tx.delete(documents).where(eq(documents.ticketId, id));
    await tx.delete(answers).where(eq(answers.ticketId, id));
    await tx.delete(events).where(eq(events.ticketId, id));
    await tx.delete(messages).where(eq(messages.ticketId, id));
    const [reset] = await tx
      .update(tickets)
      .set({
        ...demoTicket,
        generation: ticket.generation + 1,
        documentVersion: 1,
        contextVersion: 0,
        answerVersion: 0,
        answer: "",
        phase: "idle",
        status: "new",
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();
    await addEvent(tx, id, "Demonstration restarted");
    return {
      jobId: await enqueue(tx, reset, "documents"),
      files: docs.flatMap((d) => (d.storageKey ? [d.storageKey] : [])),
    };
  });
  await Promise.all(
    files.map((key) =>
      removeFile(key).catch(() => console.error("Upload cleanup failed")),
    ),
  );
  await dispatchJob(jobId);
}

export async function addMessage(
  id: string,
  content: string,
  messageId: string,
) {
  return db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const [existing] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    if (existing) {
      if (existing.ticketId !== id || existing.content !== content)
        throw new AppError("Message ID has already been used.", 409);
      return;
    }
    const conversation = await tx
      .select()
      .from(messages)
      .where(eq(messages.ticketId, id));
    if (
      conversation.length >= 50 ||
      conversation.reduce((sum, m) => sum + m.content.length, 0) +
        content.length >
        50000
    )
      throw new AppError(
        "This demo ticket supports up to 50 messages and 50,000 characters.",
      );
    await tx.insert(messages).values({
      id: messageId,
      ticketId: id,
      author: "Jamie De Clercq",
      kind: "note",
      content,
    });
    await tx
      .update(jobs)
      .set({ state: "obsolete", finishedAt: new Date() })
      .where(
        and(
          eq(jobs.ticketId, id),
          inArray(jobs.kind, ["draft", "review"]),
          inArray(jobs.state, ["queued", "running"]),
        ),
      );
    // Notes are context for the answer, not evidence for document reliability.
    const docs = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    const [activeDocs] = await tx
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.ticketId, id),
          eq(jobs.kind, "documents"),
          inArray(jobs.state, ["queued", "running"]),
        ),
      );
    const ready =
      !activeDocs &&
      docs.length > 0 &&
      docs.every((d) => d.assessedVersion === ticket.documentVersion);
    await tx
      .update(tickets)
      .set({
        contextVersion: ticket.contextVersion + 1,
        updatedAt: new Date(),
        ...(ready ? { phase: "ready", status: "open", error: null } : {}),
      })
      .where(eq(tickets.id, id));
  });
}
export async function receiveColleagueEmail(id: string) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    const messageId = `${id}-${ticket.generation}-colleague-email`;
    const [already] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    if (already) return null;
    const existing = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    const pending = demoDocuments.filter(
      (f) =>
        !existing.some((d) => d.id === `${id}-${ticket.generation}-${f.key}`),
    );
    if (
      existing.length + pending.length >= 15 ||
      [...existing, ...pending].reduce((n, d) => n + d.content.length, 0) +
        colleagueEmail.document.content.length >
        300000
    )
      throw new AppError(
        "The maximum document capacity for this ticket has been reached.",
      );
    const documentId = `${messageId}-attachment`;
    await tx.insert(documents).values({
      id: documentId,
      ticketId: id,
      ...colleagueEmail.document,
      fictional: true,
    });
    await tx.insert(messages).values({
      id: messageId,
      ticketId: id,
      author: colleagueEmail.author,
      kind: "email",
      content: colleagueEmail.content,
      documentId,
    });
    await obsoleteJobs(tx, id);
    const next = {
      ...ticket,
      documentVersion: ticket.documentVersion + 1,
      contextVersion: ticket.contextVersion + 1,
    };
    await tx
      .update(tickets)
      .set({
        documentVersion: next.documentVersion,
        contextVersion: next.contextVersion,
      })
      .where(eq(tickets.id, id));
    await addEvent(
      tx,
      id,
      "Attachment added to the research",
      "All documents will be reassessed; previous answer reviews are no longer valid.",
    );
    return enqueue(tx, next, "documents");
  });
  if (jobId) await dispatchJob(jobId);
}
