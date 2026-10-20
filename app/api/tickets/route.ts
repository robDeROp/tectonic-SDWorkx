import { z } from "zod";
import { api, sameOrigin } from "@/lib/http";
import { createTicket, listTickets } from "@/lib/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => api(listTickets);
const schema = z.object({
  customer: z.string().trim().min(2, "Enter a customer name.").max(100),
  company: z.string().trim().min(2, "Enter an organisation.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(3, "Enter a subject.").max(160),
  question: z
    .string()
    .trim()
    .min(10, "Describe the customer's question in at least 10 characters.")
    .max(10000),
});
export const POST = (request: Request) =>
  api(async () => {
    sameOrigin(request);
    const data = schema.parse(await request.json());
    return { id: await createTicket(data) };
  });
