import { z } from "zod";
import { api, sameOrigin } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { createHunch, listHunches } from "@/lib/hunch-service";
import { CURRENT_USER_ID } from "@/lib/directory";
import { extractDocument, MAX_FILE_SIZE } from "@/lib/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => api(() => listHunches(CURRENT_USER_ID));
const schema = z.object({
  title: z.string().trim().min(3, "Geef je hunch een korte titel.").max(160),
  workingOn: z
    .string()
    .trim()
    .min(10, "Beschrijf in minstens 10 tekens waar je aan werkt.")
    .max(5000),
  /** Items the author removed from Hunch's suggestion, as "kind:id". */
  exclude: z.array(z.string().max(120)).max(50).optional(),
});
/** JSON, or multipart when the description comes with a document. */
export const POST = (request: Request) =>
  api(async () => {
    sameOrigin(request);
    if (!request.headers.get("content-type")?.includes("multipart/form-data"))
      return {
        id: await createHunch(
          CURRENT_USER_ID,
          schema.parse(await request.json()),
        ),
      };
    if (Number(request.headers.get("content-length")) > MAX_FILE_SIZE + 100000)
      throw new AppError("Het bestand is groter dan 10 MB.");
    const form = await request.formData();
    const data = schema.parse({
      title: form.get("title"),
      workingOn: form.get("workingOn"),
      exclude: form.getAll("exclude"),
    });
    const file = form.get("file");
    let attachment: { name: string; text: string } | undefined;
    if (file instanceof File && file.size) {
      if (file.size > MAX_FILE_SIZE)
        throw new AppError("Het bestand is groter dan 10 MB.");
      const name = z
        .string()
        .min(1)
        .max(255)
        .parse(file.name.replace(/[\/\\]/g, "_"));
      const text = await extractDocument(
        name,
        Buffer.from(await file.arrayBuffer()),
      );
      attachment = { name, text };
    }
    return { id: await createHunch(CURRENT_USER_ID, { ...data, attachment }) };
  });
