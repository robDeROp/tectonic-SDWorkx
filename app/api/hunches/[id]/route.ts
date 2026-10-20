import { api } from "@/lib/http";
import { getHunch } from "@/lib/hunch-service";
import { CURRENT_USER_ID } from "@/lib/directory";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => api(async () => getHunch((await params).id, CURRENT_USER_ID));
