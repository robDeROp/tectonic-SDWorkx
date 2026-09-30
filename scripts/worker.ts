import { runNextJob } from "../lib/worker";
import { pool } from "../lib/db";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function main() {
  if (process.env.TASK_BACKEND === "cloud-tasks")
    throw new Error("Local worker disabled when TASK_BACKEND=cloud-tasks.");
  console.log("Ticket worker started. Waiting for tasks.");
  while (!stopping) {
    try {
      if (!(await runNextJob()))
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        "Worker: database not ready",
        error instanceof Error ? error.message : "unknown",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  await pool.end();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
