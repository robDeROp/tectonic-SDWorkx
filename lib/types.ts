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
