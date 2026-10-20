import { api } from "@/lib/http";
import { helpNotifications } from "@/lib/hunch-service";
import { CURRENT_USER_ID } from "@/lib/directory";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => api(() => helpNotifications(CURRENT_USER_ID));
