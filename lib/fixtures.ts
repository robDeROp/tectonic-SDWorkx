export const DEMO_ID = "demo-vertrekvakantiegeld";
export const demoTicket = {
  id: DEMO_ID,
  customer: "Sophie De Smet",
  company: "Atelier Noord",
  email: "sophie@atelier-noord.example",
  subject: "Holiday pay on termination of employment",
  question:
    "Dear SD Worx,\n\nOur employee Thomas is leaving the company on 30 September. He is a white-collar employee and has not taken all of his holiday entitlement this year. How do we handle his departure holiday pay in the final settlement? Do we also need to provide a holiday certificate, and what information do you need from us?\n\nThanks in advance!\nSophie De Smet\nHR Manager · Atelier Noord",
  isDemo: true,
};
export const demoDocuments = [
  {
    key: "regelgeving",
    name: "Departure holiday pay · regulatory framework",
    kind: "Legislative",
    date: "2026-08-15",
    content:
      "FICTIONAL DEMONSTRATION MATERIAL — not real legislation or legal advice. The following assumptions apply to this fictional case. When a white-collar employee leaves employment, the payroll department must examine departure holiday pay and process it in the final settlement. The calculation takes account of the relevant salary basis, employment period, holiday pay already paid and leave already taken. The employer provides a holiday certificate to the departing employee. An exact amount cannot be determined without salary and holiday history. This document contains no percentages or calculation formula. It applies only to the fictional Belgian white-collar employee case and contains no general rules for blue-collar workers.",
  },
  {
    key: "werkinstructie",
    name: "Payroll playbook · termination of employment",
    kind: "Internal",
    date: "2026-09-10",
    content:
      "FICTIONAL INTERNAL WORK INSTRUCTION — not an official SD Worx document. For the demonstration case: request the end date, employee status, relevant salary data, employment history, an overview of leave taken and remaining, and holiday pay already paid. The payroll employee checks these details before the final settlement. Include departure holiday pay in the white-collar employee's final settlement and provide the holiday certificate. Do not promise an exact amount without a calculation based on the full history. For this demo, this work instruction supersedes the internal FAQ from February 2021. Refer the customer to their payroll contact if information is missing.",
  },
  {
    key: "archief",
    name: "Holiday & departure FAQ · 2021 archive",
    kind: "Internal",
    date: "2021-02-12",
    content:
      "FICTIONAL ARCHIVE DOCUMENT — contains deliberately incorrect and contradictory information for a software demonstration. Old internal FAQ: when a white-collar employee leaves in September, we do not pay departure holiday pay through the final settlement; the new employer handles everything. A holiday certificate is not required. Ask only for the name and end date. This instruction is outdated and has been superseded by the payroll playbook from September 2026. Do not use this old instruction as the basis for the customer answer.",
  },
];

export const colleagueEmail = {
  author: "Emma Peeters",
  email: "emma.peeters@payroll.example",
  subject: "Additional termination information · holiday history",
  content:
    "Hi Jamie,\n\nI found an additional checklist for the final settlement. The salary and holiday history still need to be confirmed. Please note: the old FAQ from 2021 has been superseded. Can you include this attachment in your assessment?\n\nRegards,\nEmma\n\nFictional colleague email for the demonstration.",
  document: {
    name: "Final settlement checklist · colleague supplement.txt",
    kind: "Internal",
    date: "2026-09-30",
    content:
      "FICTIONAL DEMONSTRATION MATERIAL — additional internal checklist from a fictional colleague. For the Belgian white-collar employee case, salary history, employment period, holiday pay already paid and leave taken must be confirmed before the final settlement can be calculated. These details have not yet been confirmed. Provide a holiday certificate on termination of employment. The 2021 FAQ has been superseded by the payroll playbook from September 2026. This document adds no percentages, amounts or new legal rules.",
  },
};
