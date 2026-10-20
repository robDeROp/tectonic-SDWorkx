import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, type Transaction } from "./db";
import { helpCalls, hunchContext, hunchMessages, hunches } from "./db/schema";
import { findEmployee, type Employee } from "./directory";
import { AppError } from "./errors";
import {
  awayUntil,
  MAX_PASSES,
  contextView,
  findContext,
  outsiderView,
  personView,
  routeCall,
} from "./hunches";
import type {
  HelpCallState,
  HelpNotification,
  HunchDetail,
  HunchSource,
  HunchStatus,
  HunchSummary,
  ContextLink,
} from "./types";

type Hunch = typeof hunches.$inferSelect;
type Call = typeof helpCalls.$inferSelect;

const employee = (id: string) => {
  const e = findEmployee(id);
  if (!e)
    throw new AppError("Deze medewerker staat niet in de directory.", 404);
  return e;
};
/**
 * The people, documents and conversations linked to a hunch. Hunches from
 * before context was stored get it computed on the fly from their text.
 */
async function contextOf(
  hunch: Hunch,
  tx: Pick<typeof db, "select"> = db,
): Promise<ContextLink[]> {
  const rows = await tx
    .select()
    .from(hunchContext)
    .where(eq(hunchContext.hunchId, hunch.id));
  if (rows.length)
    return rows.map(({ kind, refId, relevance, reason }) => ({
      kind: kind as ContextLink["kind"],
      refId,
      relevance,
      reason,
    }));
  return findContext(
    `${hunch.title} ${hunch.workingOn}`,
    employee(hunch.authorId),
  );
}
/** The hunch's people, as a call for help walks them. */
const helpersOf = (links: ContextLink[]) =>
  links
    .filter((l) => l.kind === "person")
    .map((l) => ({ id: l.refId, relevance: l.relevance }));
/** The call that currently holds the hunch: the last one notified or accepted. */
const activeCall = (calls: Call[]) =>
  [...calls]
    .reverse()
    .find((c) => c.state === "notified" || c.state === "accepted") ?? null;

function summary(hunch: Hunch, calls: Call[]): HunchSummary {
  const active = hunch.status === "resolved" ? null : activeCall(calls);
  return {
    id: hunch.id,
    number: hunch.number,
    title: hunch.title,
    workingOn: hunch.workingOn,
    status: hunch.status as HunchStatus,
    source: hunch.source as HunchSource,
    sourceLabel: hunch.sourceLabel,
    author: personView(employee(hunch.authorId)),
    helper: active ? personView(employee(active.recipientId)) : null,
    createdAt: hunch.createdAt.toISOString(),
    updatedAt: hunch.updatedAt.toISOString(),
  };
}

async function callsFor(ids: string[]) {
  if (!ids.length) return new Map<string, Call[]>();
  const rows = await db
    .select()
    .from(helpCalls)
    .where(inArray(helpCalls.hunchId, ids))
    .orderBy(asc(helpCalls.createdAt));
  const map = new Map<string, Call[]>();
  for (const row of rows)
    map.set(row.hunchId, [...(map.get(row.hunchId) ?? []), row]);
  return map;
}

export async function listHunches(viewerId: string) {
  const all = await db.select().from(hunches).orderBy(desc(hunches.updatedAt));
  const calls = await callsFor(all.map((h) => h.id));
  const views = all.map((h) => summary(h, calls.get(h.id) ?? []));
  return {
    all: views,
    forYou: views.filter((h) => h.helper?.id === viewerId),
  };
}

export async function helpNotifications(
  viewerId: string,
): Promise<HelpNotification[]> {
  const open = await db
    .select()
    .from(helpCalls)
    .where(
      and(eq(helpCalls.recipientId, viewerId), eq(helpCalls.state, "notified")),
    )
    .orderBy(desc(helpCalls.createdAt));
  if (!open.length) return [];
  const rows = await db
    .select()
    .from(hunches)
    .where(
      inArray(
        hunches.id,
        open.map((c) => c.hunchId),
      ),
    );
  return open.flatMap((call) => {
    const h = rows.find((r) => r.id === call.hunchId);
    if (!h || h.status === "resolved") return [];
    return [
      {
        hunchId: h.id,
        number: h.number,
        title: h.title,
        from: personView(employee(h.authorId)),
        createdAt: call.createdAt.toISOString(),
      },
    ];
  });
}

export async function getHunch(
  id: string,
  viewerId: string,
): Promise<HunchDetail> {
  const [hunch] = await db.select().from(hunches).where(eq(hunches.id, id));
  if (!hunch) throw new AppError("Deze hunch bestaat niet.", 404);
  const calls = (await callsFor([id])).get(id) ?? [];
  const messages = await db
    .select()
    .from(hunchMessages)
    .where(eq(hunchMessages.hunchId, id))
    .orderBy(asc(hunchMessages.createdAt));
  const base = summary(hunch, calls);
  return {
    ...base,
    context: contextView(await contextOf(hunch)),
    messages: messages.map((m) => {
      const person = m.authorId ? findEmployee(m.authorId) : undefined;
      return {
        id: m.id,
        author: person
          ? personView(person)
          : outsiderView(m.authorName, m.authorDetail),
        external: !person,
        source: m.source as HunchSource,
        content: m.content,
        attachment:
          m.attachmentName && m.attachmentText !== null
            ? {
                name: m.attachmentName,
                // A preview is enough on screen; the full text stays stored.
                text: m.attachmentText.slice(0, PREVIEW_CHARS),
                length: m.attachmentText.length,
              }
            : null,
        createdAt: m.createdAt.toISOString(),
      };
    }),
    calls: calls.map((c) => ({
      id: c.id,
      recipient: personView(employee(c.recipientId)),
      state: c.state as HelpCallState,
      note: c.note,
      emailedAt: c.emailedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    passesLeft: MAX_PASSES - calls.filter((c) => c.state === "passed").length,
    viewer: {
      isAuthor: hunch.authorId === viewerId,
      isHelper: base.helper?.id === viewerId,
    },
  };
}

const PREVIEW_CHARS = 6000;

export async function createHunch(
  authorId: string,
  input: {
    title: string;
    workingOn: string;
    /** "kind:id" keys the author removed from Hunch's suggestion. */
    exclude?: string[];
    attachment?: { name: string; text: string };
  },
) {
  const author = employee(authorId);
  // An attached document is part of the question, so Hunch reads it too.
  const links = findContext(
    [input.title, input.workingOn, input.attachment?.text.slice(0, 20000)]
      .filter(Boolean)
      .join(" "),
    author,
    input.exclude,
  );
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(hunches).values({
      id,
      authorId,
      title: input.title,
      workingOn: input.workingOn,
    });
    if (links.length)
      await tx
        .insert(hunchContext)
        .values(links.map((l) => ({ hunchId: id, ...l })));
    // The description, with its optional document, opens the conversation.
    await tx.insert(hunchMessages).values({
      id: randomUUID(),
      hunchId: id,
      authorId,
      authorName: author.displayName,
      content: input.workingOn,
      attachmentName: input.attachment?.name ?? null,
      attachmentText: input.attachment?.text ?? null,
    });
  });
  return id;
}

/** A reply in the hunch conversation; anyone in the directory may join in. */
export async function addHunchMessage(
  id: string,
  viewerId: string,
  content: string,
) {
  const author = employee(viewerId);
  await db.transaction(async (tx) => {
    const { hunch } = await lockHunch(tx, id);
    await tx.insert(hunchMessages).values({
      id: randomUUID(),
      hunchId: hunch.id,
      authorId: author.id,
      authorName: author.displayName,
      content,
    });
    await tx
      .update(hunches)
      .set({ updatedAt: new Date() })
      .where(eq(hunches.id, id));
  });
}

async function lockHunch(tx: Transaction, id: string) {
  const [hunch] = await tx
    .select()
    .from(hunches)
    .where(eq(hunches.id, id))
    .for("update");
  if (!hunch) throw new AppError("Deze hunch bestaat niet.", 404);
  const calls = await tx
    .select()
    .from(helpCalls)
    .where(eq(helpCalls.hunchId, id))
    .orderBy(asc(helpCalls.createdAt));
  return { hunch, calls };
}

/** Writes the routing steps: everyone skipped for OOO, then the recipient. */
async function notify(
  tx: Transaction,
  hunchId: string,
  route: {
    skipped: { employee: Employee; until: string }[];
    recipient: Employee;
  },
) {
  const now = Date.now();
  // Distinct timestamps keep the routing trail in the order it happened.
  const at = (i: number) => new Date(now + i);
  await tx.insert(helpCalls).values([
    ...route.skipped.map(({ employee, until }, i) => ({
      id: randomUUID(),
      hunchId,
      recipientId: employee.id,
      state: "skipped",
      // For skipped steps the note holds the end of the absence.
      note: until,
      createdAt: at(i),
    })),
    {
      id: randomUUID(),
      hunchId,
      recipientId: route.recipient.id,
      state: "notified",
      emailedAt: at(route.skipped.length),
      createdAt: at(route.skipped.length),
    },
  ]);
  await tx
    .update(hunches)
    .set({ status: "waiting", updatedAt: new Date() })
    .where(eq(hunches.id, hunchId));
}

/** A recipient picked by hand: anyone in the directory who is available. */
function pickedRecipient(toId: string, authorId: string) {
  const person = employee(toId);
  if (person.id === authorId)
    throw new AppError("Je kunt jezelf geen hulpvraag sturen.", 400);
  const until = awayUntil(person);
  if (until)
    throw new AppError(
      `${person.displayName} is afwezig tot ${new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long" }).format(new Date(until))}.`,
      409,
    );
  return person;
}

/**
 * Sends the author's call for help: automatically to the most relevant
 * available person, or to `toId` when the author picks someone. With `toId`
 * a running call is redirected: the current recipient is released first.
 */
export async function callForHelp(
  id: string,
  viewerId: string,
  input: { toId?: string } = {},
) {
  await db.transaction(async (tx) => {
    const { hunch, calls } = await lockHunch(tx, id);
    if (hunch.authorId !== viewerId)
      throw new AppError("Alleen wie de hunch opende, kan hulp inroepen.", 403);
    if (hunch.status === "resolved")
      throw new AppError("Deze hunch is al opgelost.", 409);
    const active = activeCall(calls);
    if (active && !input.toId)
      throw new AppError("Voor deze hunch loopt al een hulpvraag.", 409);
    if (input.toId) {
      if (active?.recipientId === input.toId)
        throw new AppError("Deze collega heeft je hulpvraag al.", 409);
      const recipient = pickedRecipient(input.toId, hunch.authorId);
      if (active)
        await tx
          .update(helpCalls)
          .set({ state: "cancelled", note: "Omgeleid" })
          .where(eq(helpCalls.id, active.id));
      await notify(tx, id, { skipped: [], recipient });
      return;
    }
    // Only people who passed it on before are left out of a new call.
    const route = routeCall({
      people: helpersOf(await contextOf(hunch, tx)),
      authorId: hunch.authorId,
      exclude: calls
        .filter((c) => c.state === "passed")
        .map((c) => c.recipientId),
    });
    if (!route.recipient)
      throw new AppError(
        "Niemand die Hunch bij deze hunch vond, is nu beschikbaar. Kies zelf een collega.",
        409,
      );
    await notify(tx, id, { ...route, recipient: route.recipient });
  });
}

/** The author withdraws a running call; the hunch goes back to open. */
export async function cancelCall(id: string, viewerId: string) {
  await db.transaction(async (tx) => {
    const { hunch, calls } = await lockHunch(tx, id);
    if (hunch.authorId !== viewerId)
      throw new AppError(
        "Alleen wie de hunch opende, kan de hulpvraag intrekken.",
        403,
      );
    const active = activeCall(calls);
    if (!active || hunch.status === "resolved")
      throw new AppError("Er loopt geen hulpvraag om in te trekken.", 409);
    await tx
      .update(helpCalls)
      .set({ state: "cancelled", note: null })
      .where(eq(helpCalls.id, active.id));
    await tx
      .update(hunches)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(hunches.id, id));
  });
}

export async function acceptCall(id: string, viewerId: string) {
  await db.transaction(async (tx) => {
    const { hunch, calls } = await lockHunch(tx, id);
    const active = activeCall(calls);
    if (
      !active ||
      active.recipientId !== viewerId ||
      active.state !== "notified"
    )
      throw new AppError("Deze hulpvraag staat niet (meer) op jouw naam.", 409);
    await tx
      .update(helpCalls)
      .set({ state: "accepted" })
      .where(eq(helpCalls.id, active.id));
    await tx
      .update(hunches)
      .set({ status: "helping", updatedAt: new Date() })
      .where(eq(hunches.id, hunch.id));
  });
}

/**
 * A colleague offers help on an open hunch without being asked. The call is
 * recorded as accepted straight away, so the author sees who picked it up.
 */
export async function volunteer(id: string, viewerId: string) {
  await db.transaction(async (tx) => {
    const { hunch } = await lockHunch(tx, id);
    if (hunch.authorId === viewerId)
      throw new AppError("Je kunt je eigen hunch niet oppakken.", 400);
    if (hunch.status !== "open")
      throw new AppError("Iemand anders helpt hier al mee.", 409);
    await tx.insert(helpCalls).values({
      id: randomUUID(),
      hunchId: id,
      recipientId: viewerId,
      state: "accepted",
      note: "Bood zelf hulp aan",
    });
    await tx
      .update(hunches)
      .set({ status: "helping", updatedAt: new Date() })
      .where(eq(hunches.id, id));
  });
}

export async function passCall(
  id: string,
  viewerId: string,
  input: { toId?: string; note?: string },
) {
  await db.transaction(async (tx) => {
    const { hunch, calls } = await lockHunch(tx, id);
    const active = activeCall(calls);
    if (!active || active.recipientId !== viewerId)
      throw new AppError("Deze hulpvraag staat niet (meer) op jouw naam.", 409);
    if (calls.filter((c) => c.state === "passed").length >= MAX_PASSES)
      throw new AppError("Deze hulpvraag werd al te vaak doorgegeven.", 409);
    const route = input.toId
      ? { skipped: [], recipient: pickedRecipient(input.toId, hunch.authorId) }
      : routeCall({
          people: helpersOf(await contextOf(hunch, tx)),
          authorId: hunch.authorId,
          exclude: calls
            .filter((c) => c.state !== "skipped")
            .map((c) => c.recipientId),
        });
    if (route.recipient?.id === viewerId)
      throw new AppError("Kies iemand anders dan jezelf.", 400);
    if (!route.recipient)
      throw new AppError(
        "Er is niemand anders beschikbaar. Kies zelf een collega.",
        409,
      );
    await tx
      .update(helpCalls)
      .set({ state: "passed", note: input.note || null })
      .where(eq(helpCalls.id, active.id));
    await notify(tx, id, { ...route, recipient: route.recipient });
  });
}

export async function resolveHunch(id: string, viewerId: string) {
  await db.transaction(async (tx) => {
    const { hunch } = await lockHunch(tx, id);
    if (hunch.authorId !== viewerId)
      throw new AppError("Alleen wie de hunch opende, kan ze afsluiten.", 403);
    await tx
      .update(hunches)
      .set({ status: "resolved", updatedAt: new Date() })
      .where(eq(hunches.id, id));
  });
}

/* ---------- Demo data ---------- */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export async function seedHunches() {
  const [existing] = await db.select({ id: hunches.id }).from(hunches).limit(1);
  if (existing) return;
  const demo: (typeof hunches.$inferInsert)[] = [
    {
      id: "hunch-deeltijds",
      authorId: "e-jamie",
      title: "Vertrekvakantiegeld bij een deeltijdse bediende",
      workingOn:
        "Ik bereid de eindafrekening voor van een bediende bij Atelier Noord die halverwege het jaar van voltijds naar deeltijds ging. Hoe verwerk ik het vertrekvakantiegeld en wat komt er op het vakantieattest?",
      status: "waiting",
      createdAt: ago(95),
      updatedAt: ago(90),
    },
    {
      id: "hunch-api",
      authorId: "e-jamie",
      title: "Loongegevens van een klant opvragen via de API",
      workingOn:
        "Een klant wil zijn loongegevens automatisch ophalen in zijn eigen HR-tool. Welke API gebruiken we daarvoor en wie regelt de toegang?",
      status: "open",
      createdAt: ago(30),
      updatedAt: ago(30),
    },
    {
      id: "hunch-rekenregel",
      authorId: "e-noah",
      title: "Rekenregel vakantiegeld bij wisselend arbeidsregime",
      workingOn:
        "Ik werk aan PR 1842 in de loonmotor. Hoe hoort het vertrekvakantiegeld berekend te worden als een bediende tijdens het jaar deeltijds ging? Ik wil zeker zijn dat de testcases kloppen.",
      status: "waiting",
      source: "teams",
      sourceLabel: "#loonmotor-dev",
      createdAt: ago(240),
      updatedAt: ago(20),
    },
    {
      id: "hunch-attest",
      authorId: "e-tom",
      title: "Waarom komt het vakantieattest later dan de eindafrekening?",
      workingOn:
        "Een klant belt omdat zijn vertrekkende bediende de eindafrekening al kreeg, maar het vakantieattest nog niet. Ik wil hem uitleggen hoe dat proces loopt.",
      status: "waiting",
      source: "outlook",
      sourceLabel: "Vakantieattest Thomas",
      createdAt: ago(50),
      updatedAt: ago(45),
    },
    {
      id: "hunch-praktijk",
      authorId: "e-lotte",
      title:
        "Hoe passen we de nieuwe richtlijn vakantiegeld in de praktijk toe?",
      workingOn:
        "Ik schrijf een juridische nota over de nieuwe richtlijn rond vakantiegeld. Ik zoek iemand die dagelijks eindafrekeningen maakt om te toetsen of de nota werkbaar is.",
      status: "waiting",
      createdAt: ago(120),
      updatedAt: ago(8),
    },
    {
      id: "hunch-webinar",
      authorId: "e-hanne",
      title: "Voorbeelden van eindafrekeningen voor een webinar",
      workingOn:
        "Ik bereid een webinar voor HR-managers voor over uitdiensttreding. Klanten vroegen naar concrete voorbeelden van een eindafrekening met vertrekvakantiegeld. Welke voorbeelden mogen we tonen?",
      status: "open",
      createdAt: ago(55),
      updatedAt: ago(55),
    },
    {
      id: "hunch-nieuwsbrief",
      authorId: "e-jamie",
      title: "Wijziging vakantiegeld uitleggen in de nieuwsbrief",
      workingOn:
        "Ik schrijf een stuk voor de nieuwsbrief over de nieuwe regels rond vakantiegeld. Wat werkte vroeger bij klantcommunicatie over wetswijzigingen?",
      status: "resolved",
      createdAt: ago(60 * 24 * 3),
      updatedAt: ago(60 * 24 * 2),
    },
  ];
  demo.push(...colleagueHunches());
  const away = (id: string) => findEmployee(id)?.outOfOffice?.end ?? null;
  const calls: (typeof helpCalls.$inferInsert)[] = [
    {
      hunchId: "hunch-deeltijds",
      recipientId: "e-emma",
      state: "skipped",
      note: away("e-emma"),
      createdAt: ago(90),
    },
    {
      hunchId: "hunch-deeltijds",
      recipientId: "e-pieter",
      state: "notified",
      emailedAt: ago(89.9),
      createdAt: ago(89.9),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-emma",
      state: "skipped",
      note: away("e-emma"),
      createdAt: ago(200),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-pieter",
      state: "passed",
      note: "Jamie verwerkt deze casussen dagelijks.",
      emailedAt: ago(199.9),
      createdAt: ago(199.9),
    },
    {
      hunchId: "hunch-rekenregel",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(20),
      createdAt: ago(20),
    },
    {
      hunchId: "hunch-attest",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(45),
      createdAt: ago(45),
    },
    {
      hunchId: "hunch-praktijk",
      recipientId: "e-jamie",
      state: "notified",
      emailedAt: ago(8),
      createdAt: ago(8),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      recipientId: "e-yasmine",
      state: "skipped",
      note: away("e-yasmine"),
      createdAt: ago(60 * 70),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      recipientId: "e-hanne",
      state: "accepted",
      emailedAt: ago(60 * 70 - 0.1),
      createdAt: ago(60 * 70 - 0.1),
    },
  ].map((c) => ({ id: randomUUID(), ...c }));
  const messages = demoMessages(demo);
  // Each hunch links its own context from everything said in it so far.
  const context = demo.flatMap((h) =>
    findContext(
      [
        h.title,
        h.workingOn,
        ...messages.filter((m) => m.hunchId === h.id).map((m) => m.content),
      ].join(" "),
      employee(h.authorId),
    ).map((l) => ({ hunchId: h.id!, ...l })),
  );
  await db.transaction(async (tx) => {
    await tx.insert(hunches).values(demo).onConflictDoNothing();
    await tx.insert(helpCalls).values(calls);
    await tx.insert(hunchMessages).values(messages);
    await tx.insert(hunchContext).values(context);
  });
}

/**
 * Demo conversations. Hunches opened in the platform start with the author's
 * description; plugin hunches start with the thread they were opened from.
 */
function demoMessages(demo: (typeof hunches.$inferInsert)[]) {
  const by = (hunchId: string) => demo.find((h) => h.id === hunchId)!;
  const person = (id: string) => ({
    authorId: id,
    authorName: findEmployee(id)?.displayName ?? id,
  });
  const opening = (hunchId: string, extra = {}) => {
    const h = by(hunchId);
    return {
      hunchId,
      ...person(h.authorId),
      content: h.workingOn,
      createdAt: h.createdAt,
      ...extra,
    };
  };
  const rows: Omit<typeof hunchMessages.$inferInsert, "id">[] = [
    opening("hunch-deeltijds", {
      attachmentName: "Notities klantgesprek Atelier Noord.txt",
      attachmentText:
        "FICTIEVE DEMONSTRATIENOTITIES — Klantgesprek Atelier Noord\n\n" +
        "- Bediende Thomas gaat uit dienst op 30 september.\n" +
        "- Van januari tot en met mei voltijds, vanaf juni 4/5de.\n" +
        "- Nog 6 vakantiedagen niet opgenomen.\n" +
        "- Klant wil weten wat er op het vakantieattest komt en of beide periodes apart staan.\n" +
        "- Actie Jamie: berekening voorbereiden en terugkoppelen vóór vrijdag.",
    }),
    opening("hunch-api"),
    opening("hunch-webinar"),
    opening("hunch-praktijk"),
    opening("hunch-nieuwsbrief"),
    {
      hunchId: "hunch-nieuwsbrief",
      ...person("e-hanne"),
      content:
        "Kijk zeker naar de evaluatie van de indexeringscampagne. Een korte checklist bovenaan werkte veel beter dan een lange uitleg.",
      createdAt: ago(60 * 60),
    },
    {
      hunchId: "hunch-nieuwsbrief",
      ...person("e-jamie"),
      content: "Top, dat neem ik mee. Dank je!",
      createdAt: ago(60 * 48),
    },
    // Opened from a Teams thread with the Hunch plugin.
    {
      hunchId: "hunch-rekenregel",
      ...person("e-ines"),
      source: "teams",
      content:
        "Noah, kun je de testcases voor deeltijds werk nog nakijken voor we PR 1842 mergen?",
      createdAt: ago(260),
    },
    {
      hunchId: "hunch-rekenregel",
      ...person("e-noah"),
      source: "teams",
      content:
        "Doe ik. Ik weet alleen niet zeker hoe de regel hoort te werken als iemand halverwege het jaar van voltijds naar deeltijds gaat. Wie kan dat bevestigen?",
      createdAt: ago(245),
    },
    // Opened from a customer mail in Outlook with the Hunch plugin.
    {
      hunchId: "hunch-attest",
      authorName: "Sophie De Smet",
      authorDetail: "HR manager · Atelier Noord (klant)",
      source: "outlook",
      content:
        "Dag Tom,\n\nThomas heeft zijn eindafrekening ontvangen, maar het vakantieattest nog niet. Hij heeft het nodig voor zijn nieuwe werkgever. Wanneer mogen we het verwachten?\n\nGroeten,\nSophie",
      createdAt: ago(70),
    },
    {
      hunchId: "hunch-attest",
      ...person("e-tom"),
      source: "outlook",
      content:
        "Dag Sophie, ik zoek uit hoe dat proces precies loopt en kom er vandaag nog op terug.",
      createdAt: ago(52),
    },
  ];
  // Every other platform hunch opens with its description.
  const covered = new Set(rows.map((r) => r.hunchId));
  for (const h of demo)
    if (!covered.has(h.id) && (h.source ?? "hunch") === "hunch")
      rows.push(opening(h.id));
  return rows.map((m) => ({ id: randomUUID(), ...m }));
}

/** Quieter hunches from colleagues, so the full overview feels lived in. */
function colleagueHunches(): (typeof hunches.$inferInsert)[] {
  const hunch = (
    id: string,
    authorId: string,
    title: string,
    workingOn: string,
    status: string,
    minutesAgo: number,
  ) => ({
    id,
    authorId,
    title,
    workingOn,
    status,
    createdAt: ago(minutesAgo),
    updatedAt: ago(minutesAgo - 30),
  });
  return [
    hunch(
      "hunch-checklist",
      "e-pieter",
      "Checklist eindafrekening bijwerken na de nieuwe richtlijn",
      "De checklist eindafrekening moet aangepast worden aan de nieuwe richtlijn vakantiegeld. Wie heeft de laatste versie en wat moet er veranderen?",
      "open",
      180,
    ),
    hunch(
      "hunch-breaking",
      "e-bram",
      "Breaking change in de publieke API aankondigen",
      "We moeten een veld in de payroll-API hernoemen. Hoe hebben we zo'n wijziging vroeger aangekondigd aan integratiepartners?",
      "open",
      60 * 26,
    ),
    hunch(
      "hunch-indexering",
      "e-tom",
      "Wat vertellen we klanten over de indexering 2027?",
      "Klanten vragen al naar de indexering van volgend jaar. Is er een standaardantwoord of campagne in voorbereiding?",
      "open",
      60 * 48,
    ),
    hunch(
      "hunch-testomgeving",
      "e-noah",
      "Lokale testomgeving voor de loonmotor opzetten",
      "Ik ben nieuw in het team en wil de loonmotor lokaal draaien met testdata. Hoe doen we dat hier?",
      "resolved",
      60 * 24 * 4,
    ),
    hunch(
      "hunch-rekenregel-doc",
      "e-ines",
      "Hoe documenteren we een nieuwe rekenregel?",
      "Ik voeg een rekenregel toe aan de loonmotor. Waar en in welk formaat leggen we de functionele uitleg vast?",
      "resolved",
      60 * 24 * 5,
    ),
    hunch(
      "hunch-testpanel",
      "e-yasmine",
      "Welke klanten willen de nieuwe nieuwsbrief testen?",
      "We vernieuwen de nieuwsbrief voor HR-professionals. Welke klanten gaven eerder aan mee te willen testen?",
      "resolved",
      60 * 24 * 6,
    ),
  ];
}
