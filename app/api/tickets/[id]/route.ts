import { api } from "@/lib/http";
import { getDetail } from "@/lib/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => api(async () => getDetail((await params).id));
