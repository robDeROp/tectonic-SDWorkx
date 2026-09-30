import { z } from "zod";
import { api, sameOrigin } from "@/lib/http";
import { AppError } from "@/lib/errors";
import {
  addDocument,
  addMessage,
  receiveColleagueEmail,
  sendReviewedAnswer,
  overrideReview,
  requestAI,
  resetDemo,
  retryTicket,
  saveAnswer,
  startTicket,
} from "@/lib/service";
import {
  extractDocument,
  MAX_FILE_SIZE,
  removeFile,
  storeFile,
} from "@/lib/storage";
import { sourceKinds } from "@/lib/types";
export const runtime = "nodejs";
export const POST = (
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) =>
  api(async () => {
    sameOrigin(request);
    const { id, action } = await params;
    if (action === "start") {
      await startTicket(id);
      return { ok: true };
    }
    if (action === "reset") {
      await resetDemo(id);
      return { ok: true };
    }
    if (action === "retry") {
      await retryTicket(id);
      return { ok: true };
    }
    if (action === "colleague-email") {
      await receiveColleagueEmail(id);
      return { ok: true };
    }
    if (action === "upload") {
      if (
        Number(request.headers.get("content-length")) >
        MAX_FILE_SIZE + 100000
      )
        throw new AppError("Het bestand is groter dan 10 MB.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new AppError("Kies een bestand.");
      if (file.size > MAX_FILE_SIZE)
        throw new AppError("Het bestand is groter dan 10 MB.");
      const name = z
        .string()
        .min(1)
        .max(255)
        .parse(file.name.replace(/[\/\\]/g, "_"));
      const kind = z.enum(sourceKinds).parse(form.get("kind") || "Onbekend");
      const rawDate = form.get("date");
      const date = rawDate ? z.iso.date().parse(rawDate) : null;
      const buffer = Buffer.from(await file.arrayBuffer());
      const content = await extractDocument(name, buffer);
      const storageKey = await storeFile(buffer, name);
      try {
        await addDocument(id, { name, kind, date, content, storageKey });
      } catch (error) {
        await removeFile(storageKey);
        throw error;
      }
      return { ok: true };
    }
    const body = await request.json();
    if (action === "message") {
      const data = z
        .object({
          content: z.string().trim().min(1).max(5000),
          messageId: z.string().uuid(),
        })
        .parse(body);
      await addMessage(id, data.content, data.messageId);
      return { ok: true };
    }
    if (action === "send") {
      const data = z.object({ reviewId: z.string().uuid() }).parse(body);
      await sendReviewedAnswer(id, data.reviewId);
      return { ok: true };
    }
    if (action === "answer") {
      const data = z
        .object({
          answer: z.string().max(20000),
          version: z.number().int().nonnegative(),
        })
        .parse(body);
      return saveAnswer(id, data.answer, data.version);
    }
    if (action === "draft" || action === "review") {
      const data = z
        .object({ version: z.number().int().nonnegative() })
        .parse(body);
      return { jobId: await requestAI(id, action, data.version) };
    }
    if (action === "override") {
      const data = z.object({ reviewId: z.string().uuid() }).parse(body);
      await overrideReview(id, data.reviewId);
      return { ok: true };
    }
    throw new AppError("Onbekende actie.", 404);
  });
