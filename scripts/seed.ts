import { seed } from "../lib/service";
import { seedHunches } from "../lib/hunch-service";
import { pool } from "../lib/db";
Promise.all([seed(), seedHunches()])
  .then(() => console.log("Demo ticket and hunches are ready."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
