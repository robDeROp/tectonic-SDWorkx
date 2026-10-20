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
        subject: "Klantmail met collega-aanvulling en bijlage",
        question:
          "Dag Jamie,\n\nWelke informatie ontbreekt nog om de eindafrekening en het vakantieattest voor te bereiden? De loonhistoriek is nog niet bevestigd.\n\nGroeten,\nSophie\n\nFictieve testcase.",
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
        subject: "Nieuwe klantmail: toegang tot payroll-API",
        question:
          "Beste,\n\nWe willen onze HR-tool koppelen aan de payroll-API. Welke documentatie en toegang hebben we nodig?\n\nGroeten,\nMilan\n\nFictieve testcase.",
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
            "Fictieve interne notitie: de loonhistoriek moet nog bevestigd worden. De bijlage is toegevoegd; er is nog geen AI-beoordeling uitgevoerd.",
          createdAt: now,
        },
      ]);
      await tx.insert(events).values({
        id: `${ticketId}-seeded`,
        ticketId,
        label: "Testcase met mail en bijlage toegevoegd",
        detail:
          "Vier fictieve bronnen, een collega-mail en een interne notitie. Geen AI-beoordeling of verzending uitgevoerd.",
      });
    }
    return inserted.length;
  });
}
