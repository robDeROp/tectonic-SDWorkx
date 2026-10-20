import { randomUUID } from "node:crypto";
import { findEmployee } from "./directory";
import { findContext } from "./hunches";
import type { helpCalls, hunchMessages, hunches } from "./db/schema";
import { additionalHunchDemos } from "./hunch-demo-scenarios";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export function hunchDemoData() {
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
  const extra = additionalHunchDemos();
  demo.push(...colleagueHunches(), ...extra.hunches);
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
  calls.push(...extra.calls);
  const messages = [...demoMessages(demo), ...extra.messages];
  // Each hunch links its own context from everything said in it so far.
  const context = demo.flatMap((h) =>
    findContext(
      [
        h.title,
        h.workingOn,
        ...messages.filter((m) => m.hunchId === h.id).map((m) => m.content),
      ].join(" "),
      findEmployee(h.authorId)!,
    ).map((l) => ({ hunchId: h.id!, ...l })),
  );
  return { hunches: demo, calls, messages, context };
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
