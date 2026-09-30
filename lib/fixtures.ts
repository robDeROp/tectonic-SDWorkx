export const DEMO_ID = "demo-vertrekvakantiegeld";
export const demoTicket = {
  id: DEMO_ID,
  customer: "Sophie De Smet",
  company: "Atelier Noord",
  email: "sophie@atelier-noord.example",
  subject: "Vakantiegeld bij uitdiensttreding",
  question:
    "Beste SD Worx,\n\nOnze medewerker Thomas verlaat het bedrijf op 30 september. Hij is bediende en heeft dit jaar nog niet al zijn vakantiedagen opgenomen. Hoe verwerken we zijn vertrekvakantiegeld in de eindafrekening? Moeten we ook een vakantieattest bezorgen, en welke gegevens hebben jullie van ons nodig?\n\nAlvast bedankt!\nSophie De Smet\nHR Manager · Atelier Noord",
  isDemo: true,
};
export const demoDocuments = [
  {
    key: "regelgeving",
    name: "Vertrekvakantiegeld · regelgevend kader",
    kind: "Wetgevingsgericht",
    date: "2026-08-15",
    content:
      "FICTIEF DEMONSTRATIEMATERIAAL — geen echte wetgeving of juridisch advies. Voor deze fictieve casus gelden de volgende uitgangspunten. Bij de uitdiensttreding van een bediende moet de payrollafdeling het vertrekvakantiegeld onderzoeken en verwerken in de eindafrekening. De berekening houdt rekening met de relevante loonbasis, tewerkstellingsperiode, reeds uitbetaald vakantiegeld en opgenomen vakantiedagen. De werkgever bezorgt een vakantieattest aan de vertrekkende bediende. Zonder de loon- en vakantiehistoriek kan geen exact bedrag worden vastgesteld. Dit document bevat geen percentages of rekensleutel. Het geldt uitsluitend voor de fictieve Belgische bediendecasus en bevat geen algemene regels voor arbeiders.",
  },
  {
    key: "werkinstructie",
    name: "Payroll playbook · uitdiensttreding",
    kind: "Intern",
    date: "2026-09-10",
    content:
      "FICTIEVE INTERNE WERKINSTRUCTIE — geen officieel document van SD Worx. Voor de demonstratiecasus: vraag de einddatum, het werknemersstatuut, de relevante loongegevens, de tewerkstellingshistoriek, het overzicht van opgenomen en resterende vakantiedagen en reeds uitbetaald vakantiegeld op. De payrollmedewerker controleert deze gegevens vóór de eindafrekening. Neem vertrekvakantiegeld mee in de eindafrekening van de bediende en bezorg het vakantieattest. Beloof geen exact bedrag zonder berekening op basis van de volledige historiek. Deze werkinstructie vervangt voor deze demo de interne FAQ van februari 2021. Verwijs de klant bij ontbrekende informatie naar zijn payrollcontact.",
  },
  {
    key: "archief",
    name: "FAQ vakantie & vertrek · archief 2021",
    kind: "Intern",
    date: "2021-02-12",
    content:
      "FICTIEF ARCHIEFDOCUMENT — bevat opzettelijk onjuiste en tegenstrijdige informatie voor een softwaredemonstratie. Oude interne FAQ: bij vertrek van een bediende in september betalen we geen vertrekvakantiegeld via de eindafrekening; de nieuwe werkgever regelt alles. Een vakantieattest is niet nodig. Vraag alleen de naam en einddatum op. Deze instructie is verouderd en is vervangen door het payroll playbook van september 2026. Gebruik deze oude instructie niet als grondslag voor het klantantwoord.",
  },
];

export const colleagueEmail = {
  author: "Emma Peeters",
  email: "emma.peeters@payroll.example",
  subject: "Aanvulling uitdiensttreding · vakantiehistoriek",
  content:
    "Dag Jamie,\n\nIk vond nog een aanvullende checklist voor de eindafrekening. De loon- en vakantiehistoriek moeten nog worden bevestigd. Let op: de oude FAQ uit 2021 is vervangen. Kun je deze bijlage meenemen in je beoordeling?\n\nGroeten,\nEmma\n\nFictieve collega-mail voor de demonstratie.",
  document: {
    name: "Checklist eindafrekening · aanvulling collega.txt",
    kind: "Intern",
    date: "2026-09-30",
    content:
      "FICTIEF DEMONSTRATIEMATERIAAL — aanvullende interne checklist van een fictieve collega. Voor de Belgische bediendecasus moeten de loonhistoriek, tewerkstellingsperiode, reeds betaald vakantiegeld en opgenomen vakantiedagen bevestigd worden voordat de eindafrekening kan worden berekend. Deze gegevens zijn nog niet bevestigd. Bezorg een vakantieattest bij uitdiensttreding. De FAQ van 2021 is vervangen door het payroll playbook van september 2026. Dit document voegt geen percentages, bedragen of nieuwe wettelijke regels toe.",
  },
};
