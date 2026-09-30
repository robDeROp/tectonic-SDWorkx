import { seed } from "../lib/service";
import { pool } from "../lib/db";
seed()
  .then(() => console.log("Demo ticket is ready."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
