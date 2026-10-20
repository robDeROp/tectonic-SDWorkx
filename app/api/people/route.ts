import { api } from "@/lib/http";
import { employees } from "@/lib/directory";
import { personView } from "@/lib/hunches";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The Entra reference table, for picking a colleague by hand. */
export const GET = () => api(async () => employees.map((e) => personView(e)));
