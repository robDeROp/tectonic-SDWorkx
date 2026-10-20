import { db } from "./db";
import { documents, events, messages, tickets } from "./db/schema";
import { colleagueEmail, demoDocuments } from "./fixtures";

/** Additional inbox cases; no AI jobs or outgoing mail are started by seeding. */
export async function seedTicketScenarios() {
  const now = new Date();
  return db.transaction(async (tx) => {
    const existing = new Set(
      (await tx.select({ id: tickets.id }).from(tickets)).map((row) => row.id),
    );
    const examples: (typeof tickets.$inferInsert)[] = [
      {
        id: "demo-mail-met-bijlage",
        customer: "Sophie De Smet",
        company: "Atelier Noord",
        email: "sophie@atelier-noord.example",
        subject: "Customer email with a colleague's supplement and attachment",
        question:
          "Hi Jamie,\n\nWhat information is still missing to prepare the final settlement and holiday certificate? The salary history has not yet been confirmed.\n\nRegards,\nSophie\n\nFictional test case.",
        status: "open",
        phase: "ready",
        contextVersion: 2,
        documentVersion: 2,
      },
      {
        id: "demo-mail-api",
        customer: "Milan Verhoeven",
        company: "Studio Rivier",
        email: "milan@studio-rivier.example",
        subject: "New customer email: access to the payroll API",
        question:
          "Hello,\n\nWe want to connect our HR tool to the payroll API. What documentation and access do we need?\n\nRegards,\nMilan\n\nFictional test case.",
      },
    ];
    const missing = examples.filter((row) => !existing.has(row.id!));
    if (!missing.length) return 0;
    const inserted = await tx
      .insert(tickets)
      .values(missing)
      .onConflictDoNothing()
      .returning({ id: tickets.id });
    if (inserted.some((row) => row.id === "demo-mail-met-bijlage")) {
      const ticketId = "demo-mail-met-bijlage";
      const documentId = `${ticketId}-attachment`;
      await tx.insert(documents).values([
        ...demoDocuments.map(({ key, ...document }) => ({
          ...document,
          id: `${ticketId}-${key}`,
          ticketId,
          fictional: true,
        })),
        {
          ...colleagueEmail.document,
          id: documentId,
          ticketId,
          fictional: true,
        },
      ]);
      await tx.insert(messages).values([
        {
          id: `${ticketId}-colleague`,
          ticketId,
          author: colleagueEmail.author,
          kind: "email",
          content: colleagueEmail.content,
          documentId,
          createdAt: new Date(now.getTime() - 60_000),
        },
        {
          id: `${ticketId}-note`,
          ticketId,
          author: "Jamie De Clercq",
          kind: "note",
          content:
            "Fictional internal note: the salary history still needs to be confirmed. The attachment has been added; no AI assessment has been performed yet.",
          createdAt: now,
        },
      ]);
      await tx.insert(events).values({
        id: `${ticketId}-seeded`,
        ticketId,
        label: "Test case with email and attachment added",
        detail:
          "Four fictional sources, a colleague email and an internal note. No AI assessment or sending has taken place.",
      });
    }
    return inserted.length;
  });
}
