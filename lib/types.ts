import { z } from "zod";
export const sourceKinds = [
  "Wetgevingsgericht",
  "Intern",
  "Extern",
  "Onbekend",
] as const;
export const citationSchema = z.object({
  documentId: z.string(),
  quote: z.string().min(1),
});
const jevDimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
});
export const jevAssessmentSchema = z.object({
  model: z.string().min(1),
  assessedAt: z.string(),
  relevance: jevDimensionSchema,
  reliability: jevDimensionSchema,
  freshness: jevDimensionSchema.nullable(),
});
export type JevAssessment = z.infer<typeof jevAssessmentSchema>;
export const assessmentSchema = z.object({
  documentId: z.string(),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  source: z.string().min(1),
  age: z.string().min(1),
  relevance: z.string().min(1),
  contradictions: z.array(z.string()),
  jev: jevAssessmentSchema.optional(),
});
export const assessmentResultSchema = z.object({
  assessments: z.array(assessmentSchema).min(1),
});
export const draftResultSchema = z.object({
  answer: z.string().min(1).max(20000),
  citations: z.array(citationSchema),
});
export const reviewResultSchema = z.object({
  verdict: z.enum(["approved", "changes_requested"]),
  summary: z.string().min(1),
  findings: z.array(
    z.object({
      category: z.enum(["relevance", "evidence", "missing", "contradiction"]),
      severity: z.enum(["info", "warning", "error"]),
      passage: z.string(),
      explanation: z.string().min(1),
      citations: z.array(citationSchema),
    }),
  ),
});
export type DocumentAssessment = z.infer<typeof assessmentSchema>;
export type DraftResult = z.infer<typeof draftResultSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type JobResult =
  z.infer<typeof assessmentResultSchema> | DraftResult | ReviewResult;
export type SourceDocument = {
  id: string;
  name: string;
  kind: string;
  date: string | null;
  content: string;
  fictional: boolean;
  assessment?: DocumentAssessment | null;
};
export type MessageView = {
  id: string;
  author: string;
  kind: string;
  content: string;
  documentId: string | null;
  createdAt: string;
};
export type JobInput = {
  jevAssessments?: Record<string, JevAssessment>;
  messages?: { author: string; kind: string; content: string }[];
  question: string;
  answer: string;
  documents: SourceDocument[];
};
export type TicketSummary = {
  id: string;
  number: number;
  customer: string;
  company: string;
  email: string;
  subject: string;
  question: string;
  status: string;
  phase: string;
  isDemo: boolean;
  generation: number;
  documentVersion: number;
  contextVersion: number;
  answerVersion: number;
  answer: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};
export type DocumentView = SourceDocument & {
  assessment: DocumentAssessment | null;
  assessedVersion: number | null;
  createdAt: string;
};
export type JobView = {
  id: string;
  kind: string;
  state: string;
  generation: number;
  documentVersion: number;
  contextVersion: number;
  answerVersion: number;
  result: JobResult | null;
  error: string | null;
  dispatchError: string | null;
  createdAt: string;
  finishedAt: string | null;
};
export type EventView = {
  jobId: string | null;
  id: string;
  label: string;
  detail: string | null;
  tone: string;
  createdAt: string;
};
export type DeliveryView = {
  reviewId: string;
  id: string;
  recipient: string;
  subject: string;
  content: string;
  overridden: boolean;
  createdAt: string;
};
export type TicketDetail = {
  ticket: TicketSummary;
  documents: DocumentView[];
  jobs: JobView[];
  events: EventView[];
  messages: MessageView[];
  deliveries: DeliveryView[];
  ai: { configured: boolean; missing: string[]; model: string | null };
};

/* ---------- Hunches ---------- */
export type PersonView = {
  id: string;
  name: string;
  initials: string;
  /** Stable avatar colour, 0–4. */
  tone: number;
  jobTitle: string;
  team: string;
  /** End of the current out-of-office period, or null when available. */
  awayUntil: string | null;
  relevance?: number;
  signal?: string;
};
/** One person, document or conversation linked to a hunch, and why. */
export type ContextLink = {
  kind: "person" | "document" | "conversation";
  refId: string;
  relevance: number;
  reason: string;
};
/** Everything Hunch linked to a hunch, most relevant first. */
export type HunchContextView = {
  people: PersonView[];
  documents: {
    id: string;
    name: string;
    source: string;
    location: string;
    owner: string;
    updatedAt: string;
    relevance: number;
    reason: string;
  }[];
  conversations: {
    id: string;
    title: string;
    channel: string;
    location: string;
    participants: PersonView[];
    lastActivity: string;
    snippet: string;
    relevance: number;
    reason: string;
  }[];
};
export type HunchStatus = "open" | "waiting" | "helping" | "resolved";
/** Where a hunch or message comes from: the platform or a plugin. */
export type HunchSource = "hunch" | "teams" | "outlook";
export type HunchMessageView = {
  id: string;
  /** A directory person, or an outside sender such as a customer. */
  author: PersonView;
  external: boolean;
  source: HunchSource;
  content: string;
  attachment: { name: string; text: string; length: number } | null;
  createdAt: string;
};
export type HelpCallState =
  "skipped" | "notified" | "accepted" | "passed" | "cancelled";
export type HelpCallView = {
  id: string;
  recipient: PersonView;
  state: HelpCallState;
  note: string | null;
  emailedAt: string | null;
  createdAt: string;
};
export type HunchSummary = {
  id: string;
  number: number;
  title: string;
  workingOn: string;
  status: HunchStatus;
  source: HunchSource;
  sourceLabel: string | null;
  author: PersonView;
  /** Who currently holds the call for help, if anyone. */
  helper: PersonView | null;
  createdAt: string;
  updatedAt: string;
};
export type HunchDetail = HunchSummary & {
  context: HunchContextView;
  relatedHunches: HunchSummary[];
  messages: HunchMessageView[];
  calls: HelpCallView[];
  passesLeft: number;
  viewer: { isAuthor: boolean; isHelper: boolean };
};
export type HunchActionSource = {
  id: string;
  label: string;
  kind: "person" | "document" | "conversation" | "hunch" | "message";
  detail: string;
  personIds: string[];
  href?: string;
};
export type HunchActionPlan = {
  model: string;
  generatedAt: string;
  actions: {
    title: string;
    reason: string;
    kind: "contact" | "read" | "follow_up";
    person: { id: string; name: string; awayUntil: string | null } | null;
    evidence: { sourceId: string; quote: string }[];
  }[];
  sources: HunchActionSource[];
};
export type HelpNotification = {
  hunchId: string;
  number: number;
  title: string;
  from: PersonView;
  createdAt: string;
};
