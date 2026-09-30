import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractDocument, MAX_FILE_SIZE } from "../lib/storage";
describe("Document text extraction", () => {
  it.each(["txt", "docx", "pdf"])("reads a real %s file", async (ext) => {
    const text = await extractDocument(
      `extra.${ext}`,
      await readFile(`tests/fixtures/extra.${ext}`),
    );
    expect(text).toContain("vakantieattest");
  });
  it("rejects empty files", async () => {
    await expect(extractDocument("empty.txt", Buffer.from(""))).rejects.toThrow(
      "leeg",
    );
  });
  it("rejects unsupported and disguised formats", async () => {
    await expect(
      extractDocument("bad.exe", Buffer.from("not a document")),
    ).rejects.toThrow("Kies");
    await expect(
      extractDocument("bad.pdf", Buffer.from("not a pdf")),
    ).rejects.toThrow("gelezen");
  });
  it("rejects PDFs without usable text", async () => {
    await expect(
      extractDocument("empty.pdf", await readFile("tests/fixtures/empty.pdf")),
    ).rejects.toThrow("tekstherkenning");
  });
  it("rejects oversized uploads", async () => {
    await expect(
      extractDocument("big.txt", Buffer.alloc(MAX_FILE_SIZE + 1)),
    ).rejects.toThrow("10 MB");
  });
  it("rejects excessive extracted text", async () => {
    await expect(
      extractDocument("big.txt", Buffer.from("a".repeat(100001))),
    ).rejects.toThrow("100.000");
  });
});
