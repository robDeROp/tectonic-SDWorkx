import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import mammoth from "mammoth";
import { AppError } from "./errors";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export async function extractDocument(
  name: string,
  buffer: Buffer,
): Promise<string> {
  if (!buffer.length) throw new AppError("Dit bestand is leeg.");
  if (buffer.length > MAX_FILE_SIZE)
    throw new AppError("Het bestand is groter dan 10 MB.");
  const ext = path.extname(name).toLowerCase();
  let content = "";
  try {
    if (ext === ".txt")
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    else if (ext === ".docx") {
      if (buffer.readUInt16LE(0) !== 0x4b50) throw new Error("Invalid DOCX");
      content = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === ".pdf") {
      if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-")))
        throw new Error("Invalid PDF");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        content = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else throw new AppError("Kies een PDF-, TXT- of DOCX-bestand.");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Dit bestand kon niet worden gelezen. Gebruik een leesbaar PDF-, UTF-8 TXT- of DOCX-bestand.",
    );
  }
  content = content.replace(/\u0000/g, "").trim();
  if (content.replace(/--\s*\d+ of \d+\s*--/g, "").trim().length < 10)
    throw new AppError(
      "Geen bruikbare tekst gevonden. Gescande PDF’s hebben eerst tekstherkenning nodig.",
    );
  if (content.length > 100000)
    throw new AppError(
      "Dit document bevat te veel tekst. Gebruik maximaal 100.000 tekens per document.",
    );
  return content;
}
export async function storeFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const key = randomUUID() + path.extname(filename).toLowerCase();
  if (process.env.STORAGE_BACKEND === "gcs") {
    if (!process.env.GCS_BUCKET)
      throw new AppError("De cloudopslag is nog niet geconfigureerd.", 503);
    await new Storage()
      .bucket(process.env.GCS_BUCKET)
      .file(key)
      .save(buffer, { resumable: false });
  } else {
    const dir = path.resolve(
      /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
    );
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ dir, key), buffer);
  }
  return key;
}
export async function removeFile(key: string) {
  if (process.env.STORAGE_BACKEND === "gcs")
    await new Storage()
      .bucket(process.env.GCS_BUCKET!)
      .file(key)
      .delete({ ignoreNotFound: true });
  else
    await unlink(
      path.join(
        /* turbopackIgnore: true */ path.resolve(
          /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
        ),
        path.basename(key),
      ),
    ).catch(() => {});
}
