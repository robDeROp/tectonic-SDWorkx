import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { api } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { runNextJob } from "@/lib/worker";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
export const runtime = "nodejs";
export const maxDuration = 300;
export const POST = (request: Request) =>
  api(async () => {
    if (
      process.env.TASK_BACKEND !== "cloud-tasks" ||
      !process.env.APP_URL ||
      !process.env.CLOUD_TASKS_SERVICE_ACCOUNT
    )
      throw new AppError("Niet beschikbaar.", 404);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new AppError("Authenticatie vereist.", 401);
    try {
      const identity = await new OAuth2Client().verifyIdToken({
        idToken: token,
        audience: process.env.APP_URL,
      });
      const payload = identity.getPayload();
      if (
        !payload?.email_verified ||
        payload.email !== process.env.CLOUD_TASKS_SERVICE_ACCOUNT
      )
        throw new Error("Wrong service identity");
    } catch {
      throw new AppError("Ongeldige taakidentiteit.", 403);
    }
    const { jobId } = z
      .object({ jobId: z.string().uuid() })
      .parse(await request.json());
    if (!(await runNextJob(jobId))) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
      if (job?.state === "running" || job?.state === "queued")
        throw new AppError("Taak is nog bezig. Probeer later opnieuw.", 503);
    }
    return { ok: true };
  });
