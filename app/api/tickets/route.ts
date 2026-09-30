import { z } from "zod";
import { api, sameOrigin } from "@/lib/http";
import { createTicket, listTickets } from "@/lib/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => api(listTickets);
const schema = z.object({
  customer: z.string().trim().min(2, "Vul een klantnaam in.").max(100),
  company: z.string().trim().min(2, "Vul een organisatie in.").max(120),
  email: z.email("Vul een geldig e-mailadres in.").max(254),
  subject: z.string().trim().min(3, "Vul een onderwerp in.").max(160),
  question: z
    .string()
    .trim()
    .min(10, "Beschrijf de klantvraag in minstens 10 tekens.")
    .max(10000),
});
export const POST = (request: Request) =>
  api(async () => {
    sameOrigin(request);
    const data = schema.parse(await request.json());
    return { id: await createTicket(data) };
  });
