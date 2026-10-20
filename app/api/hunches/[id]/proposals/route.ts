import { api, sameOrigin } from "@/lib/http";
import { CURRENT_USER_ID } from "@/lib/directory";
import {
  generateHunchActionPlan,
  getHunchActionPlan,
} from "@/lib/hunch-actions-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
type Context = { params: Promise<{ id: string }> };
export const GET = (_request: Request, { params }: Context) =>
  api(async () => getHunchActionPlan((await params).id, CURRENT_USER_ID));
export const POST = (request: Request, { params }: Context) =>
  api(async () => {
    sameOrigin(request);
    return {
      plan: await generateHunchActionPlan((await params).id, CURRENT_USER_ID),
    };
  });
