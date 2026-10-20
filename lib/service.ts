import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
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
import { completionScore, relevanceMatch } from "./hunch";
export type Ticket = typeof tickets.$inferSelect;
function requireOpen(ticket: Ticket) {
  if (ticket.lifecycle !== "open")
    throw new AppError(
      "Heropen deze Hunch om informatie of antwoorden te wijzigen.",
      409,
    );
}
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
  if (!ticket) throw new AppError("Deze Hunch bestaat niet.", 404);
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
  requireOpen(ticket);
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
      ? "Documentonderzoek ingepland"
      : kind === "draft"
        ? "AI-concept aangevraagd"
        : "Antwoordreview ingepland",
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
  if (!ticket) throw new AppError("Deze Hunch bestaat niet.", 404);
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
  const candidates = await db
    .select()
    .from(tickets)
    .where(ne(tickets.id, id))
    .orderBy(desc(tickets.updatedAt))
    .limit(200);
  const query = `${ticket.subject} ${ticket.question}`;
  const related = candidates
    .map((candidate) => ({
      id: candidate.id,
      number: candidate.number,
      subject: candidate.subject,
      question: candidate.question,
      customer: candidate.customer,
      company: candidate.company,
      lifecycle: candidate.lifecycle,
      ...relevanceMatch(
        query,
        `${candidate.subject} ${candidate.question} ${candidate.answer}`,
      ),
    }))
    .filter(
      (candidate) =>
        candidate.matchedTerms.length >= 2 || candidate.score >= 25,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const relatedMessages = related.length
    ? await db
        .select()
        .from(messages)
        .where(
          inArray(
            messages.ticketId,
            related.map((item) => item.id),
          ),
        )
    : [];
  const discussions = [...conversation, ...relatedMessages]
    .filter((message) => message.kind !== "note")
    .map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      subject:
        message.ticketId === id
          ? ticket.subject
          : related.find((item) => item.id === message.ticketId)!.subject,
      ...relevanceMatch(query, message.content),
    }))
    .filter((message) => message.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  return {
    ticket,
    documents: docs.map(({ storageKey: _key, ...d }) => d),
    jobs: runs,
    events: timeline,
    deliveries: sent,
    messages: conversation,
    related,
    discussions,
    ai: aiConfiguration(),
  };
}
export async function createTicket(data: {
  customer: string;
  company: string;
  email: string;
  subject: string;
  question: string;
  intakeChannel?: "email" | "teams" | "other";
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
      "Klantvraag ontvangen",
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
    if (ticket.phase !== "idle" || ticket.lifecycle !== "open") return null;
    await addEvent(
      tx,
      id,
      "Klantvraag ontvangen",
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
    requireOpen(ticket);
    if (ticket.answerVersion !== expectedVersion)
      throw new AppError(
        "Het antwoord is elders gewijzigd. Herlaad de Hunch voordat je verdergaat.",
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
    storageKey: string | null;
    sourceTicketId?: string;
    fictional?: boolean;
  },
) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    requireOpen(ticket);
    const existing = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    if (
      data.sourceTicketId &&
      existing.some((doc) => doc.sourceTicketId === data.sourceTicketId)
    )
      throw new AppError("Deze Hunch is al gekoppeld.", 409);
    const pendingFixtures = demoDocuments.filter(
      (fixture) =>
        relevanceMatch(ticket.question, `${fixture.name} ${fixture.content}`)
          .score > 0 &&
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
        "De demo ondersteunt maximaal 15 documenten en 300.000 tekens per Hunch.",
      );
    await obsoleteJobs(tx, id);
    await tx
      .insert(documents)
      .values({ id: randomUUID(), ticketId: id, origin: "work", ...data });
    const version = ticket.documentVersion + 1;
    await tx
      .update(tickets)
      .set({ documentVersion: version })
      .where(eq(tickets.id, id));
    await addEvent(
      tx,
      id,
      "Extra document toegevoegd",
      `${data.name} · eerdere reviews zijn vervallen`,
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
    requireOpen(ticket);
    if (ticket.answerVersion !== expectedVersion)
      throw new AppError(
        "Het antwoord is gewijzigd. Sla de actuele tekst op en probeer opnieuw.",
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
      throw new AppError("Wacht tot de huidige verwerking klaar is.", 409);
    }
    const docs = await tx
      .select()
      .from(documents)
      .where(eq(documents.ticketId, id));
    if (
      !docs.length ||
      docs.some((d) => d.assessedVersion !== ticket.documentVersion)
    )
      throw new AppError("Laat eerst de actuele documenten beoordelen.", 409);
    if (kind === "review" && !ticket.answer.trim())
      throw new AppError("Schrijf eerst een antwoord.");
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
    "Verzending gesimuleerd",
    `${ticket.email}${override ? " · AI-bezwaren bewust overruled door demomedewerker" : " · antwoord goedgekeurd"}`,
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
    requireOpen(ticket);
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
        "Deze review is niet afgerond of niet meer actueel.",
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
    requireOpen(ticket);
    const [last] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.ticketId, id))
      .orderBy(desc(jobs.createdAt));
    if (!last) return enqueue(tx, ticket, "documents");
    if (last.state === "queued") return last.id;
    if (last.state === "running") {
      if (last.leaseUntil && last.leaseUntil.getTime() > Date.now())
        throw new AppError("De verwerking is nog bezig.", 409);
      await tx
        .update(jobs)
        .set({ state: "queued", leaseToken: null, leaseUntil: null })
        .where(eq(jobs.id, last.id));
      return last.id;
    }
    if (last.state !== "failed")
      throw new AppError("Er is geen mislukte verwerking om te herhalen.", 409);
    return enqueue(tx, ticket, last.kind);
  });
  await dispatchJob(jobId);
}
export async function resetDemo(id: string) {
  if (id !== DEMO_ID)
    throw new AppError(
      "Alleen de oorspronkelijke demo-Hunch kan opnieuw worden afgespeeld.",
    );
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
        lifecycle: "open",
        completion: null,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();
    await addEvent(tx, id, "Demonstratie opnieuw gestart");
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
    requireOpen(ticket);
    const [existing] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    if (existing) {
      if (existing.ticketId !== id || existing.content !== content)
        throw new AppError("Bericht-id is al gebruikt.", 409);
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
        "Deze demo-Hunch ondersteunt maximaal 50 berichten en 50.000 tekens.",
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
    requireOpen(ticket);
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
        relevanceMatch(ticket.question, `${f.name} ${f.content}`).score > 0 &&
        !existing.some((d) => d.id === `${id}-${ticket.generation}-${f.key}`),
    );
    if (
      existing.length + pending.length >= 15 ||
      [...existing, ...pending].reduce((n, d) => n + d.content.length, 0) +
        colleagueEmail.document.content.length >
        300000
    )
      throw new AppError(
        "De maximale documentruimte voor deze Hunch is bereikt.",
      );
    const documentId = `${messageId}-attachment`;
    await tx.insert(documents).values({
      id: documentId,
      ticketId: id,
      ...colleagueEmail.document,
      fictional: true,
      origin: "work",
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
      "Bijlage toegevoegd aan het onderzoek",
      "Alle documenten worden opnieuw beoordeeld; eerdere antwoordreviews vervallen.",
    );
    return enqueue(tx, next, "documents");
  });
  if (jobId) await dispatchJob(jobId);
}

export async function linkHunch(id: string, sourceId: string) {
  if (id === sourceId)
    throw new AppError("Een Hunch kan niet naar zichzelf verwijzen.");
  const [source] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, sourceId));
  if (!source) throw new AppError("Deze Hunch bestaat niet.", 404);
  await addDocument(id, {
    name: `Hunch HNG-${String(source.number).padStart(4, "0")} · ${source.subject}`,
    kind: "Intern",
    date: source.updatedAt.toISOString().slice(0, 10),
    content: `Gekoppelde Hunch · ${source.subject}\nStatus: ${source.lifecycle}\n\nOorspronkelijke vraag:\n${source.question}\n\nAntwoord op het moment van koppelen:\n${source.answer || "Nog geen antwoord. Deze Hunch is geen afgeronde oplossing."}`,
    storageKey: null,
    sourceTicketId: source.id,
    fictional: source.isDemo,
  });
}

export async function setHunchLifecycle(
  id: string,
  lifecycle: Ticket["lifecycle"],
) {
  const jobId = await db.transaction(async (tx) => {
    const ticket = await lockTicket(tx, id);
    if (ticket.lifecycle === lifecycle) return;
    let completion = ticket.completion;
    if (lifecycle === "open") completion = null;
    if (lifecycle === "closed" && !completion) {
      const active = await tx
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.ticketId, id),
            inArray(jobs.state, ["queued", "running"]),
          ),
        );
      if (active.length)
        throw new AppError(
          "Wacht tot de beoordeling is afgerond voordat je deze Hunch sluit.",
          409,
        );
      const docs = await tx
        .select()
        .from(documents)
        .where(eq(documents.ticketId, id));
      const [review] = await tx
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.ticketId, id),
            eq(jobs.kind, "review"),
            eq(jobs.state, "done"),
            eq(jobs.generation, ticket.generation),
            eq(jobs.documentVersion, ticket.documentVersion),
            eq(jobs.contextVersion, ticket.contextVersion),
            eq(jobs.answerVersion, ticket.answerVersion),
          ),
        )
        .orderBy(desc(jobs.createdAt));
      if (
        !docs.length ||
        docs.some(
          (doc) =>
            !doc.assessment || doc.assessedVersion !== ticket.documentVersion,
        ) ||
        !review?.result
      )
        throw new AppError(
          "Beoordeel eerst alle bronnen en controleer je antwoord. Daarna krijgt de Hunch een eindscore.",
          409,
        );
      completion = completionScore(
        docs.map((doc) => doc.assessment!),
        review.result as ReviewResult,
        new Date().toISOString(),
      );
    }
    if (lifecycle === "archived") await obsoleteJobs(tx, id);
    await tx
      .update(tickets)
      .set({ lifecycle, completion, updatedAt: new Date() })
      .where(eq(tickets.id, id));
    await addEvent(
      tx,
      id,
      lifecycle === "closed"
        ? "Hunch gesloten"
        : lifecycle === "archived"
          ? "Hunch gearchiveerd"
          : "Hunch heropend",
    );
    if (lifecycle === "open") {
      const docs = await tx
        .select()
        .from(documents)
        .where(eq(documents.ticketId, id));
      if (
        !docs.length ||
        docs.some(
          (doc) =>
            !doc.assessment || doc.assessedVersion !== ticket.documentVersion,
        )
      )
        return enqueue(
          tx,
          { ...ticket, lifecycle: "open", completion: null },
          "documents",
        );
    }
    return null;
  });
  if (jobId) await dispatchJob(jobId);
}
