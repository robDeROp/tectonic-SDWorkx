import { db } from "./db";
import {
  documents,
  helpCalls,
  hunchContext,
  hunchMessages,
  hunches,
  messages,
  tickets,
} from "./db/schema";
import { buildKnowledgeGraph } from "./knowledge";
import type { ContextLink, KnowledgeGraph } from "./types";

/** The kennisgraaf over everything currently in the database and directory. */
export async function loadKnowledgeGraph(): Promise<KnowledgeGraph> {
  const [h, links, calls, hm, t, docs, tm] = await Promise.all([
    db
      .select({
        id: hunches.id,
        number: hunches.number,
        title: hunches.title,
        workingOn: hunches.workingOn,
        status: hunches.status,
        source: hunches.source,
        sourceLabel: hunches.sourceLabel,
        authorId: hunches.authorId,
        updatedAt: hunches.updatedAt,
      })
      .from(hunches),
    db.select().from(hunchContext),
    db
      .select({
        hunchId: helpCalls.hunchId,
        recipientId: helpCalls.recipientId,
        state: helpCalls.state,
      })
      .from(helpCalls),
    db
      .select({
        hunchId: hunchMessages.hunchId,
        authorId: hunchMessages.authorId,
      })
      .from(hunchMessages),
    db
      .select({
        id: tickets.id,
        number: tickets.number,
        customer: tickets.customer,
        company: tickets.company,
        subject: tickets.subject,
        question: tickets.question,
        status: tickets.status,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets),
    db
      .select({
        id: documents.id,
        ticketId: documents.ticketId,
        name: documents.name,
        kind: documents.kind,
        date: documents.date,
        content: documents.content,
        fictional: documents.fictional,
        createdAt: documents.createdAt,
      })
      .from(documents),
    db
      .select({ ticketId: messages.ticketId, author: messages.author })
      .from(messages),
  ]);
  return buildKnowledgeGraph({
    hunches: h,
    hunchLinks: links.map((l) => ({
      ...l,
      kind: l.kind as ContextLink["kind"],
    })),
    helpCalls: calls,
    hunchMessages: hm,
    tickets: t,
    ticketDocuments: docs,
    ticketMessages: tm,
  });
}
