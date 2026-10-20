import { seed } from "../lib/service";
import { seedHunches } from "../lib/hunch-service";
import { seedTicketScenarios } from "../lib/ticket-demo";
import { pool } from "../lib/db";
async function main() {
  await seed();
  const hunches = await seedHunches();
  const tickets = await seedTicketScenarios();
  console.log(
    `Demo data ready: ${hunches} hunches and ${tickets} ticket scenarios added. Existing cases preserved.`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
