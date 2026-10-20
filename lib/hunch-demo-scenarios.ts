import { randomUUID } from "node:crypto";
import { findEmployee } from "./directory";
import type { helpCalls, hunchMessages, hunches } from "./db/schema";
import type { HelpCallState, HunchSource, HunchStatus } from "./types";

type Scenario = {
  id: string;
  author: string;
  source: HunchSource;
  label?: string;
  status: HunchStatus;
  title: string;
  question: string;
  minutesAgo: number;
  calls?: { recipient: string; state: HelpCallState; note?: string }[];
  messages: {
    author?: string;
    external?: { name: string; detail: string };
    source: HunchSource;
    content: string;
    attachment?: { name: string; text: string };
  }[];
};

const scenarios: Scenario[] = [
  {
    id: "hunch-samenwerken",
    author: "e-jamie",
    source: "hunch",
    status: "helping",
    title: "Samen de checklist voor vertrekvakantiegeld afronden",
    question:
      "Ik werk de checklist voor de eindafrekening bij. Welke gegevens over deeltijds werk moeten we nog opvragen?",
    minutesAgo: 80,
    calls: [{ recipient: "e-lotte", state: "accepted" }],
    messages: [
      {
        author: "e-lotte",
        source: "hunch",
        content:
          "Ik kijk mee. Laten we eerst de loonhistoriek en de wijziging van het arbeidsregime bevestigen. Daarna lopen we samen de checklist door.",
      },
    ],
  },
  {
    id: "hunch-teams-api",
    author: "e-jamie",
    source: "teams",
    label: "#api-integraties",
    status: "open",
    title: "Teams: toegang tot de payroll-API voorbereiden",
    question:
      "In Teams vraagt een klantteam welke toegang nodig is voor de payroll-API. Ik zoek de documentatie en de juiste collega.",
    minutesAgo: 25,
    messages: [
      {
        author: "e-noah",
        source: "teams",
        content:
          "Heeft iemand de checklist voor API-toegang bij een nieuwe integratiepartner?",
      },
      {
        author: "e-jamie",
        source: "teams",
        content:
          "Ik zoek de onboardingdocumentatie erbij. We hebben nog geen toegang aangevraagd.",
      },
    ],
  },
  {
    id: "hunch-teams-hulp",
    author: "e-noah",
    source: "teams",
    label: "#loonmotor-dev",
    status: "helping",
    title: "Teams: payroll controleert de testcasus voor deeltijds werk",
    question:
      "De rekenregel voor vertrekvakantiegeld heeft een extra testcasus nodig. Jamie helpt de functionele invoer na te kijken.",
    minutesAgo: 110,
    calls: [{ recipient: "e-jamie", state: "accepted" }],
    messages: [
      {
        author: "e-noah",
        source: "teams",
        content:
          "Ik heb een testcasus voor een overstap naar 4/5de klaar. Wie kan de invoer functioneel nakijken?",
      },
      {
        author: "e-jamie",
        source: "teams",
        content: "Stuur de fictieve gegevens door, dan kijk ik mee.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "Ik heb de hulpvraag opgepakt. Ik vergelijk de periodes met de checklist voor eindafrekeningen.",
      },
    ],
  },
  {
    id: "hunch-teams-opgelost",
    author: "e-jamie",
    source: "teams",
    label: "#api-integraties",
    status: "resolved",
    title: "Teams: documentatie voor API-toegang gevonden",
    question:
      "We zochten de juiste API-onboarding voor een integratiepartner. De documentatie is gevonden en gedeeld.",
    minutesAgo: 150,
    calls: [{ recipient: "e-ines", state: "accepted" }],
    messages: [
      {
        author: "e-jamie",
        source: "teams",
        content: "Waar staat de actuele documentatie voor de payroll-API?",
      },
      {
        author: "e-ines",
        source: "teams",
        content: "Die staat in de DevOps Wiki. Ik geef je de juiste ingang.",
      },
      {
        author: "e-ines",
        source: "hunch",
        content:
          "De API-onboarding staat bij de relevante documenten. Begin met de toegang en het testaccount.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content: "Gevonden, bedankt! Ik kan verder en sluit deze hunch.",
      },
    ],
  },
  {
    id: "hunch-outlook-bijlage",
    author: "e-jamie",
    source: "outlook",
    label: "Aanvullende gegevens eindafrekening",
    status: "open",
    title: "Outlook: klantmail met bijlage over de eindafrekening",
    question:
      "De klant stuurde aanvullende notities voor een eindafrekening. Ik wil controleren welke gegevens nog ontbreken.",
    minutesAgo: 35,
    messages: [
      {
        external: {
          name: "Sophie De Smet",
          detail: "HR manager · Atelier Noord (fictieve klant)",
        },
        source: "outlook",
        content:
          "Dag Jamie,\n\nIn de bijlage staan onze notities voor de eindafrekening. Kun je aangeven welke gegevens nog ontbreken?\n\nGroeten,\nSophie",
        attachment: {
          name: "Klantnotities eindafrekening.txt",
          text: "FICTIEVE TESTDATA\n\nThomas vertrekt op 30 september. Vanaf juni werkt hij 4/5de. De loonhistoriek en het overzicht van opgenomen vakantiedagen moeten nog bevestigd worden. Deze notities bevatten geen berekening.",
        },
      },
      {
        author: "e-jamie",
        source: "outlook",
        content:
          "Dag Sophie, bedankt voor de notities. Ik loop ze na en koppel terug welke gegevens nog nodig zijn.",
      },
    ],
  },
  {
    id: "hunch-outlook-hulp",
    author: "e-jamie",
    source: "outlook",
    label: "Controle vakantieattest",
    status: "helping",
    title: "Outlook: collega helpt bij de controle van een vakantieattest",
    question:
      "Een klant vraagt of alle periodes correct op het vakantieattest staan. Pieter helpt de dossiergegevens te controleren.",
    minutesAgo: 65,
    calls: [{ recipient: "e-pieter", state: "accepted" }],
    messages: [
      {
        external: {
          name: "Milan Verhoeven",
          detail: "HR medewerker · Studio Rivier (fictieve klant)",
        },
        source: "outlook",
        content:
          "Dag Jamie,\n\nKun je controleren of de voltijdse en deeltijdse periode beide verwerkt zijn in het vakantieattest? We willen dit graag afronden.\n\nBedankt,\nMilan",
      },
      {
        author: "e-jamie",
        source: "outlook",
        content:
          "Ik laat de tewerkstellingshistoriek mee nakijken door mijn collega.",
      },
      {
        author: "e-pieter",
        source: "hunch",
        content:
          "Ik heb dit opgepakt. Ik controleer de twee periodes en laat weten of er informatie ontbreekt.",
      },
    ],
  },
  {
    id: "hunch-outlook-opgelost",
    author: "e-tom",
    source: "outlook",
    label: "Re: benodigde gegevens voor eindafrekening",
    status: "resolved",
    title: "Outlook: ontbrekende dossiergegevens verduidelijkt",
    question:
      "De klant wist niet welke gegevens nodig waren voor de eindafrekening. Jamie hielp de checklist te verduidelijken.",
    minutesAgo: 200,
    calls: [{ recipient: "e-jamie", state: "accepted" }],
    messages: [
      {
        external: {
          name: "Sophie De Smet",
          detail: "HR manager · Atelier Noord (fictieve klant)",
        },
        source: "outlook",
        content:
          "Dag Tom, welke gegevens moeten we nog bezorgen voordat jullie de eindafrekening kunnen voorbereiden?",
      },
      {
        author: "e-tom",
        source: "outlook",
        content: "Ik stem de checklist af met payroll en kom erop terug.",
      },
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "Vraag de loonhistoriek, arbeidsregimes, opgenomen vakantiedagen en reeds betaald vakantiegeld op. De interne checklist staat bij de context.",
      },
      {
        author: "e-tom",
        source: "hunch",
        content:
          "De benodigde gegevens zijn duidelijk. Deze voorbeeldcase is afgerond.",
      },
    ],
  },
  {
    id: "hunch-geannuleerd",
    author: "e-jamie",
    source: "hunch",
    status: "open",
    title: "Hulpvraag ingetrokken: checklist zelf teruggevonden",
    question:
      "Ik zocht de checklist eindafrekening en vroeg hulp. Intussen vond ik de juiste versie, dus de hulpvraag is ingetrokken.",
    minutesAgo: 100,
    calls: [
      {
        recipient: "e-pieter",
        state: "cancelled",
        note: "Checklist zelf gevonden",
      },
    ],
    messages: [
      {
        author: "e-jamie",
        source: "hunch",
        content:
          "De hulpvraag is ingetrokken. Ik werk zelf verder met de gevonden checklist.",
      },
    ],
  },
  {
    id: "hunch-doorgeven-limiet",
    author: "e-noah",
    source: "hunch",
    status: "waiting",
    title: "Hulpvraag na twee keer doorgeven bij payroll",
    question:
      "Voor de rekenregel vertrekvakantiegeld zoek ik iemand die dagelijks eindafrekeningen verwerkt. De vraag is twee keer doorgegeven.",
    minutesAgo: 130,
    calls: [
      {
        recipient: "e-pieter",
        state: "passed",
        note: "Lotte kan de functionele uitleg verduidelijken.",
      },
      {
        recipient: "e-lotte",
        state: "passed",
        note: "Jamie verwerkt deze cases dagelijks.",
      },
      { recipient: "e-jamie", state: "notified" },
    ],
    messages: [
      {
        author: "e-noah",
        source: "hunch",
        content:
          "De vraag ligt nu bij Jamie. Dit voorbeeld toont de grens van twee keer doorgeven.",
      },
    ],
  },
  {
    id: "hunch-geen-bronnen",
    author: "e-jamie",
    source: "hunch",
    status: "open",
    title: "Nieuwe vraag zonder passende kennisbronnen",
    question:
      "Ik organiseer een introductiemoment en zoek praktische ervaringen met de ontvangst van nieuwe bezoekers.",
    minutesAgo: 45,
    messages: [],
  },
];

export function additionalHunchDemos() {
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const rows: (typeof hunches.$inferInsert)[] = [];
  const calls: (typeof helpCalls.$inferInsert)[] = [];
  const messages: (typeof hunchMessages.$inferInsert)[] = [];
  for (const scenario of scenarios) {
    rows.push({
      id: scenario.id,
      authorId: scenario.author,
      source: scenario.source,
      sourceLabel: scenario.label,
      title: scenario.title,
      workingOn: scenario.question,
      status: scenario.status,
      createdAt: ago(scenario.minutesAgo),
      updatedAt: ago(scenario.minutesAgo - 20),
    });
    for (const [index, call] of (scenario.calls ?? []).entries()) {
      const createdAt = ago(scenario.minutesAgo - 5 - index * 2);
      calls.push({
        id: randomUUID(),
        hunchId: scenario.id,
        recipientId: call.recipient,
        state: call.state,
        note: call.note,
        createdAt,
        emailedAt: call.state === "skipped" ? null : createdAt,
      });
    }
    const imported = scenario.messages.filter(
      (message) => message.source !== "hunch",
    ).length;
    for (const [index, message] of scenario.messages.entries()) {
      messages.push({
        id: randomUUID(),
        hunchId: scenario.id,
        authorId: message.author,
        authorName:
          message.external?.name ?? findEmployee(message.author!)!.displayName,
        authorDetail: message.external?.detail,
        source: message.source,
        content: message.content,
        attachmentName: message.attachment?.name,
        attachmentText: message.attachment?.text,
        createdAt: ago(
          message.source === "hunch"
            ? scenario.minutesAgo - 10 - (index - imported) * 2
            : scenario.minutesAgo + (imported - index) * 2,
        ),
      });
    }
  }
  return { hunches: rows, calls, messages };
}
