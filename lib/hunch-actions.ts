import { z } from "zod";
import { expertise, findDocument, findEmployee } from "./directory";
import { personView } from "./hunches";
import { AppError } from "./errors";
import type { HunchActionPlan, HunchActionSource, HunchDetail } from "./types";

export const hunchActionsSchema = z.object({
  actions: z
    .array(
      z.object({
        title: z.string().min(3).max(150),
        reason: z.string().min(10).max(700),
        kind: z.enum(["contact", "read", "follow_up"]),
        personId: z.string().nullable(),
        evidence: z
          .array(
            z.object({
              sourceId: z.string(),
              quote: z.string().min(8).max(600),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .min(1)
    .max(4),
});

export function hunchActionInput(hunch: HunchDetail) {
  const sources: HunchActionSource[] = [];
  for (const person of hunch.context.people)
    sources.push({
      id: `person:${person.id}`,
      label: person.name,
      kind: "person",
      personIds: [person.id],
      detail: `${person.name} · ${person.jobTitle} · ${person.team}. ${expertise
        .filter((item) => item.employeeId === person.id)
        .map((item) => item.signal)
        .join(
          ". ",
        )}${person.awayUntil ? ` Afwezig tot ${person.awayUntil.slice(0, 10)}.` : " Beschikbaar."}`,
    });
  for (const document of hunch.context.documents) {
    const ownerId = findDocument(document.id)?.ownerId;
    sources.push({
      id: `document:${document.id}`,
      label: document.name,
      kind: "document",
      personIds: ownerId ? [ownerId] : [],
      detail: `Document: ${document.name}. Eigenaar: ${document.owner}. Bron: ${document.source}. Locatie: ${document.location}. ${document.reason}. Alleen metadata beschikbaar; de documentinhoud is niet meegeleverd.`,
    });
  }
  for (const conversation of hunch.context.conversations)
    sources.push({
      id: `conversation:${conversation.id}`,
      label: conversation.title,
      kind: "conversation",
      personIds: conversation.participants.map((person) => person.id),
      detail: `${conversation.title} · ${conversation.channel} · ${conversation.location}. Deelnemers: ${conversation.participants.map((person) => person.name).join(", ")}. ${conversation.snippet}`,
    });
  for (const related of hunch.relatedHunches)
    sources.push({
      id: `hunch:${related.id}`,
      label: related.title,
      kind: "hunch",
      personIds: [
        related.author.id,
        ...(related.helper ? [related.helper.id] : []),
      ],
      href: `/hunches/${related.id}`,
      detail: `${related.title}. Vraag: ${related.workingOn}. Auteur: ${related.author.name}. Status: ${related.status}.${related.helper ? ` Helper: ${related.helper.name}.` : ""}`,
    });
  for (const message of hunch.messages.slice(-20))
    sources.push({
      id: `message:${message.id}`,
      label: `Bericht van ${message.author.name}`,
      kind: "message",
      personIds: message.external ? [] : [message.author.id],
      detail: `${message.author.name}: ${message.content}${message.attachment ? `\nBijlage ${message.attachment.name} (tekstvoorbeeld): ${message.attachment.text}` : ""}`,
    });
  const candidates = [...new Set(sources.flatMap((source) => source.personIds))]
    .filter((id) => id !== hunch.author.id)
    .flatMap((id) => {
      const employee = findEmployee(id);
      if (!employee) return [];
      const person = personView(employee);
      return [
        {
          id,
          name: person.name,
          awayUntil: person.awayUntil?.slice(0, 10) ?? null,
        },
      ];
    });
  return {
    question: hunch.title,
    workingOn: hunch.workingOn,
    status: hunch.status,
    authorId: hunch.author.id,
    sources,
    candidates,
  };
}

export function validateHunchActions(
  value: unknown,
  input: ReturnType<typeof hunchActionInput>,
): HunchActionPlan["actions"] {
  return hunchActionsSchema.parse(value).actions.map((action) => {
    for (const evidence of action.evidence) {
      const source = input.sources.find(
        (item) => item.id === evidence.sourceId,
      );
      if (!source || !source.detail.includes(evidence.quote))
        throw new AppError(
          "Een bronverwijzing van Gemini klopt niet. Stel de voorstellen opnieuw op.",
          502,
        );
    }
    const person = action.personId
      ? input.candidates.find((candidate) => candidate.id === action.personId)
      : null;
    if (action.kind === "contact") {
      if (
        !person ||
        !action.evidence.some((evidence) =>
          input.sources
            .find((source) => source.id === evidence.sourceId)
            ?.personIds.includes(person.id),
        )
      )
        throw new AppError(
          "Gemini verwijst naar een collega zonder onderbouwde koppeling aan deze hunch.",
          502,
        );
    } else if (action.personId !== null) {
      throw new AppError("Gemini gaf een ongeldige actie terug.", 502);
    }
    const { personId: _, ...rest } = action;
    return { ...rest, person: person ?? null };
  });
}
