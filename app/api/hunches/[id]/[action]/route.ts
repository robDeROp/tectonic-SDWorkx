import { z } from "zod";
import { api, sameOrigin } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { CURRENT_USER_ID } from "@/lib/directory";
import {
  acceptCall,
  addHunchMessage,
  callForHelp,
  cancelCall,
  passCall,
  resolveHunch,
  volunteer,
  updateHunchStatus,
} from "@/lib/hunch-service";
export const runtime = "nodejs";
const helpSchema = z.object({ toId: z.string().max(100).optional() });
const statusSchema = z.object({
  status: z.enum(["open", "waiting", "helping", "resolved"]),
  expectedStatus: z.enum(["open", "waiting", "helping", "resolved"]),
  toId: z.string().max(100).optional(),
});
const messageSchema = z.object({
  content: z.string().trim().min(1, "Write a message first.").max(5000),
});
const passSchema = z.object({
  toId: z.string().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});
export const POST = (
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) =>
  api(async () => {
    sameOrigin(request);
    const { id, action } = await params;
    if (action === "help")
      await callForHelp(
        id,
        CURRENT_USER_ID,
        helpSchema.parse(await request.json()),
      );
    else if (action === "message")
      await addHunchMessage(
        id,
        CURRENT_USER_ID,
        messageSchema.parse(await request.json()).content,
      );
    else if (action === "cancel") await cancelCall(id, CURRENT_USER_ID);
    else if (action === "accept") await acceptCall(id, CURRENT_USER_ID);
    else if (action === "volunteer") await volunteer(id, CURRENT_USER_ID);
    else if (action === "pass")
      await passCall(
        id,
        CURRENT_USER_ID,
        passSchema.parse(await request.json()),
      );
    else if (action === "resolve") await resolveHunch(id, CURRENT_USER_ID);
    else if (action === "status")
      await updateHunchStatus(
        id,
        CURRENT_USER_ID,
        statusSchema.parse(await request.json()),
      );
    else throw new AppError("Unknown action.", 404);
    return { ok: true };
  });
