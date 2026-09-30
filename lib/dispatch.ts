import { CloudTasksClient } from "@google-cloud/tasks";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { jobs } from "./db/schema";
export async function dispatchJob(id: string) {
  if (process.env.TASK_BACKEND !== "cloud-tasks") return;
  try {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.CLOUD_TASKS_LOCATION;
    const queue = process.env.CLOUD_TASKS_QUEUE;
    const email = process.env.CLOUD_TASKS_SERVICE_ACCOUNT;
    const origin = process.env.APP_URL;
    if (
      !project ||
      !location ||
      !queue ||
      !email ||
      !origin?.startsWith("https://")
    )
      throw new Error("Cloud Tasks configuration missing");
    const client = new CloudTasksClient();
    await client.createTask({
      parent: client.queuePath(project, location, queue),
      task: {
        name: client.taskPath(
          project,
          location,
          queue,
          `${id}-${randomUUID()}`,
        ),
        dispatchDeadline: { seconds: 300 },
        httpRequest: {
          httpMethod: "POST",
          url: `${origin}/api/internal/tasks`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(JSON.stringify({ jobId: id })).toString("base64"),
          oidcToken: { serviceAccountEmail: email, audience: origin },
        },
      },
    });
    await db.update(jobs).set({ dispatchError: null }).where(eq(jobs.id, id));
  } catch (error) {
    console.error(
      "Cloud Tasks dispatch failed",
      error instanceof Error ? error.name : "unknown",
    );
    await db
      .update(jobs)
      .set({
        dispatchError:
          "De taak kon niet worden ingepland. Controleer Cloud Tasks en probeer opnieuw.",
      })
      .where(eq(jobs.id, id));
  }
}
