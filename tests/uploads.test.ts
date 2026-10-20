import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractDocument, MAX_FILE_SIZE } from "../lib/storage";
import JSZip from "jszip";
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
  it("extracts PowerPoint text in slide order, preserving paragraph breaks", async () => {
    const zip = new JSZip();
    for (const n of [10, 2, 1])
      zip.file(
        `ppt/slides/slide${n}.xml`,
        `<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:p><a:r><a:t>Slide ${n}: vakantieattest</a:t></a:r></a:p><a:p><a:r><a:t>Volgende stap</a:t></a:r></a:p></p:sld>`,
      );
    const text = await extractDocument(
      "plan.pptx",
      await zip.generateAsync({ type: "nodebuffer" }),
    );
    expect(text.indexOf("Slide 1:")).toBeLessThan(text.indexOf("Slide 2:"));
    expect(text.indexOf("Slide 2:")).toBeLessThan(text.indexOf("Slide 10:"));
    expect(text).toContain("vakantieattest\nVolgende stap");
  });
  it("extracts Excel shared strings, inline strings and cached formula values with cell context", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/workbook.xml",
      '<workbook xmlns:r="urn:r"><sheets><sheet name="Berekening" r:id="rId1"/></sheets></workbook>',
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    );
    zip.file(
      "xl/sharedStrings.xml",
      "<sst><si><t>vakantieattest</t></si></sst>",
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><f>100+20</f><v>120</v></c><c r="C1" t="inlineStr"><is><t>Controleer</t></is></c></row></sheetData></worksheet>',
    );
    const text = await extractDocument(
      "berekening.xlsx",
      await zip.generateAsync({ type: "nodebuffer" }),
    );
    expect(text).toContain(
      "Berekening\nA1: vakantieattest | B1: 120 | C1: Controleer",
    );
  });
  it("rejects inflated Office content and disguised files", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", "<a>".repeat(2_000_000));
    await expect(
      extractDocument(
        "large.pptx",
        await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
      ),
    ).rejects.toThrow("uitgepakte");
    await expect(
      extractDocument("fake.xlsx", Buffer.from("not an Excel file")),
    ).rejects.toThrow("gelezen");
  });
});
