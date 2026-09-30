import { randomUUID } from "node:crypto";
import { and, asc, eq, lt, or, sql } from "drizzle-orm";
import { db, type Transaction } from "./db";
import { answers, documents, jobs, tickets } from "./db/schema";
import { callGemini, validateResult, type AIProvider } from "./ai";
import { demoDocuments } from "./fixtures";
import { addEvent, lockTicket, type Ticket } from "./service";
import { publicError } from "./errors";
import type { JobInput } from "./types";
type Job = typeof jobs.$inferSelect;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export function currentJob(
  job: Pick<
    Job,
    | "generation"
    | "documentVersion"
    | "answerVersion"
    | "contextVersion"
    | "kind"
  >,
  ticket: Pick<
    Ticket,
    "generation" | "documentVersion" | "answerVersion" | "contextVersion"
  >,
) {
  return (
    job.generation === ticket.generation &&
    job.documentVersion === ticket.documentVersion &&
    (job.kind === "documents" ||
      (job.answerVersion === ticket.answerVersion &&
        job.contextVersion === ticket.contextVersion))
  );
}
async function ownsJob(tx: Transaction, job: Job, ticket: Ticket) {
  const [current] = await tx.select().from(jobs).where(eq(jobs.id, job.id));
  return (
    current?.state === "running" &&
    current.leaseToken === job.leaseToken &&
    currentJob(job, ticket)
  );
}
export async function runNextJob(
  jobId?: string,
  provider: AIProvider = callGemini,
  animate = true,
): Promise<boolean> {
  const job = await db.transaction(async (tx) => {
    const available = or(
      eq(jobs.state, "queued"),
      and(eq(jobs.state, "running"), lt(jobs.leaseUntil, new Date())),
    );
    const [candidate] = await tx
      .select()
      .from(jobs)
      .where(jobId ? and(eq(jobs.id, jobId), available) : available)
      .orderBy(asc(jobs.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!candidate) return null;
    const [claimed] = await tx
      .update(jobs)
      .set({
        state: "running",
        leaseToken: randomUUID(),
        leaseUntil: new Date(Date.now() + 180000),
        attempts: sql`${jobs.attempts} + 1`,
        dispatchError: null,
      })
      .where(eq(jobs.id, candidate.id))
      .returning();
    return claimed;
  });
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void db
      .update(jobs)
      .set({ leaseUntil: new Date(Date.now() + 180000) })
      .where(
        and(
          eq(jobs.id, job.id),
          eq(jobs.leaseToken, job.leaseToken!),
          eq(jobs.state, "running"),
        ),
      )
      .catch(() => console.error("Job heartbeat failed"));
  }, 20000);
  heartbeat.unref();
  try {
    if (job.kind === "documents") {
      for (const fixture of demoDocuments) {
        const alive = await db.transaction(async (tx) => {
          const ticket = await lockTicket(tx, job.ticketId);
          if (!(await ownsJob(tx, job, ticket))) return false;
          const [inserted] = await tx
            .insert(documents)
            .values({
              id: `${job.ticketId}-${job.generation}-${fixture.key}`,
              ticketId: job.ticketId,
              name: fixture.name,
              kind: fixture.kind,
              date: fixture.date,
              content: fixture.content,
              fictional: true,
            })
            .onConflictDoNothing()
            .returning();
          if (inserted)
            await addEvent(
              tx,
              job.ticketId,
              "Document ontvangen",
              fixture.name,
              "info",
              job.id,
            );
          return true;
        });
        if (!alive) return true;
        if (animate) await delay(650);
      }
    }
    const input = await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, job.ticketId);
      if (!(await ownsJob(tx, job, ticket))) return null;
      let input: JobInput = job.input;
      if (job.kind === "documents") {
        const docs = await tx
          .select()
          .from(documents)
          .where(eq(documents.ticketId, job.ticketId))
          .orderBy(asc(documents.createdAt));
        input = {
          question: ticket.question,
          answer: ticket.answer,
          documents: docs.map(
            ({ id, name, kind, date, content, fictional }) => ({
              id,
              name,
              kind,
              date,
              content,
              fictional,
            }),
          ),
        };
        await tx.update(jobs).set({ input }).where(eq(jobs.id, job.id));
        await tx
          .update(tickets)
          .set({ phase: "assessing" })
          .where(eq(tickets.id, ticket.id));
      }
      await addEvent(
        tx,
        ticket.id,
        job.kind === "documents"
          ? "Betrouwbaarheid beoordelen"
          : job.kind === "draft"
            ? "Antwoord formuleren met Gemini"
            : "Antwoord toetsen aan de bronnen",
        `${input.documents.length} documenten · versie ${ticket.documentVersion}`,
        "info",
        job.id,
      );
      return input;
    });
    if (!input) return true;
    const result = validateResult(
      job.kind,
      await provider(job.kind, input),
      input,
    );
    await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, job.ticketId);
      if (!(await ownsJob(tx, job, ticket))) return;
      await tx
        .update(jobs)
        .set({
          state: "done",
          result,
          error: null,
          finishedAt: new Date(),
          leaseUntil: null,
        })
        .where(eq(jobs.id, job.id));
      if ("assessments" in result) {
        for (const assessment of result.assessments)
          await tx
            .update(documents)
            .set({ assessment, assessedVersion: ticket.documentVersion })
            .where(
              and(
                eq(documents.id, assessment.documentId),
                eq(documents.ticketId, ticket.id),
              ),
            );
        await tx
          .update(tickets)
          .set({
            phase: "ready",
            status: "open",
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, ticket.id));
        await addEvent(
          tx,
          ticket.id,
          "Klaar voor antwoord",
          "Bronnen beoordeeld; onzekerheden en conflicten zijn zichtbaar.",
          "success",
          job.id,
        );
      } else if ("answer" in result) {
        const version = ticket.answerVersion + 1;
        await tx.insert(answers).values({
          id: randomUUID(),
          ticketId: ticket.id,
          generation: ticket.generation,
          version,
          content: result.answer,
          source: "gemini",
        });
        await tx
          .update(tickets)
          .set({
            answer: result.answer,
            answerVersion: version,
            phase: "ready",
            status: "open",
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, ticket.id));
        await addEvent(
          tx,
          ticket.id,
          "AI-concept gereed",
          "Lees het antwoord na en pas aan waar nodig.",
          "success",
          job.id,
        );
      } else {
        await addEvent(
          tx,
          ticket.id,
          result.verdict === "approved"
            ? "Antwoordreview goedgekeurd"
            : "Antwoordreview vraagt aandacht",
          result.summary,
          result.verdict === "approved" ? "success" : "warning",
          job.id,
        );
        await tx
          .update(tickets)
          .set({
            phase: "reviewed",
            status: result.verdict === "approved" ? "reviewed" : "attention",
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, ticket.id));
      }
    });
  } catch (error) {
    console.error(
      "Background job failed",
      job.id,
      error instanceof Error ? error.name : "unknown",
    );
    await db.transaction(async (tx) => {
      const ticket = await lockTicket(tx, job.ticketId);
      if (!(await ownsJob(tx, job, ticket))) return;
      const message = publicError(error);
      await tx
        .update(jobs)
        .set({
          state: "failed",
          error: message,
          finishedAt: new Date(),
          leaseUntil: null,
        })
        .where(eq(jobs.id, job.id));
      await tx
        .update(tickets)
        .set({
          phase: "error",
          status: "attention",
          error: message,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket.id));
      await addEvent(
        tx,
        ticket.id,
        "Verwerking onderbroken",
        message,
        "error",
        job.id,
      );
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
