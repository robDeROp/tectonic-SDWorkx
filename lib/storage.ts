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
  if (!buffer.length) throw new AppError("This file is empty.");
  if (buffer.length > MAX_FILE_SIZE)
    throw new AppError("The file is larger than 10 MB.");
  const ext = path.extname(name).toLowerCase();
  let content = "";
  try {
    if (ext === ".txt" || ext === ".md")
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    else if (ext === ".docx") {
      if (buffer.readUInt16LE(0) !== 0x4b50) throw new Error("Invalid DOCX");
      content = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === ".pdf") {
      if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-")))
        throw new Error("Invalid PDF");
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = getDocument({
        data: new Uint8Array(buffer),
        verbosity: 0,
      });
      try {
        const document = await loadingTask.promise;
        const pages: string[] = [];
        for (
          let pageNumber = 1;
          pageNumber <= document.numPages;
          pageNumber++
        ) {
          const page = await document.getPage(pageNumber);
          const text = await page.getTextContent();
          pages.push(
            text.items
              .map((item) =>
                "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
              )
              .join(""),
          );
          page.cleanup();
        }
        content = pages.join("\n\n");
      } finally {
        await loadingTask.destroy();
      }
    } else throw new AppError("Choose a PDF, TXT, MD or DOCX file.");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "This file could not be read. Use a readable PDF, UTF-8 TXT or DOCX file.",
    );
  }
  content = content.replace(/\u0000/g, "").trim();
  if (content.replace(/--\s*\d+ of \d+\s*--/g, "").trim().length < 10)
    throw new AppError(
      "No usable text found. Scanned PDFs need text recognition first.",
    );
  if (content.length > 100000)
    throw new AppError(
      "This document contains too much text. Use no more than 100,000 characters per document.",
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
      throw new AppError("Cloud storage is not configured yet.", 503);
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
