import { randomUUID } from "node:crypto";
import { hunchDemoData } from "./hunch-demo";
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

/** Add missing demo cases atomically without resetting existing work. */
export async function seedHunches() {
  const demo = hunchDemoData();
  return db.transaction(async (tx) => {
    const existing = new Set(
      (await tx.select({ id: hunches.id }).from(hunches)).map((row) => row.id),
    );
    const missing = demo.hunches.filter((row) => !existing.has(row.id!));
    if (!missing.length) return 0;
    const inserted = await tx
      .insert(hunches)
      .values(missing)
      .onConflictDoNothing()
      .returning({ id: hunches.id });
    const ids = new Set(inserted.map((row) => row.id));
    if (!ids.size) return 0;
    const calls = demo.calls.filter((row) => ids.has(row.hunchId));
    const messages = demo.messages.filter((row) => ids.has(row.hunchId));
    const context = demo.context.filter((row) => ids.has(row.hunchId));
    if (calls.length) await tx.insert(helpCalls).values(calls);
    if (messages.length) await tx.insert(hunchMessages).values(messages);
    if (context.length) await tx.insert(hunchContext).values(context);
    return ids.size;
  });
}
