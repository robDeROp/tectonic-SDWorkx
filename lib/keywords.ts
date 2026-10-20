/** English index terms also recognise questions written before the language change. */
const aliases: Record<string, string[]> = {
  "holiday pay": ["vakantiegeld"],
  "departure holiday pay": ["vertrekvakantiegeld"],
  "final settlement": ["eindafrekening"],
  "termination of employment": ["uitdiensttreding"],
  "leaving employment": ["uit dienst"],
  "holiday certificate": ["vakantieattest"],
  "holiday entitlement": ["vakantiedagen", "holiday days", "leave taken"],
  holiday: ["vakantie"],
  dismissal: ["ontslag"],
  "white-collar employee": ["bediende"],
  "part-time": ["deeltijds", "part time"],
  "payroll engine": ["loonmotor"],
  integration: ["integratie"],
  "calculation rule": ["rekenregel"],
  "payroll data": ["loongegevens", "salary data"],
  "test environment": ["testomgeving"],
  campaign: ["campagne"],
  newsletter: ["nieuwsbrief"],
  communication: ["communicatie"],
  "customer communication": ["klantcommunicatie"],
  audience: ["doelgroep"],
  indexation: ["indexering"],
  guideline: ["richtlijn"],
  regulation: ["regelgeving"],
  legal: ["juridisch"],
  versioning: ["versiebeheer"],
  architecture: ["architectuur"],
  documentation: ["documenteren", "documenting", "document a"],
  "test case": ["testcas"],
  customer: ["klanten"],
  "salary history": ["loonhistoriek"],
  connect: ["koppel"],
};

export function matchesKeyword(text: string, keyword: string) {
  return [keyword, ...(aliases[keyword] ?? [])].some((term) =>
    new RegExp(
      `(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "iu",
    ).test(text),
  );
}
