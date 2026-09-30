import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { ticketPool?: Pool };
export const pool =
  globalDb.ticketPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://demo:demo@127.0.0.1:54329/ticket_studio",
    max: 5,
    connectionTimeoutMillis: 4000,
  });
if (process.env.NODE_ENV !== "production") globalDb.ticketPool = pool;
export const db = drizzle(pool, { schema });
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
