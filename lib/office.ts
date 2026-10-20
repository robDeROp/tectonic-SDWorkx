import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { AppError } from "./errors";

// Bound inflated XML as well as the uploaded ZIP; small files can expand greatly.
const MAX_XML = 5 * 1024 * 1024;
export async function extractOffice(buffer: Buffer, format: ".pptx" | ".xlsx") {
  const zip = await JSZip.loadAsync(buffer);
  if (Object.keys(zip.files).length > 5000)
    throw new AppError("Dit bestand bevat te veel onderdelen.");
  let totalBytes = 0;
  async function xml(path: string) {
    const entry = zip.file(path);
    if (!entry) return null;
    const content = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = entry.nodeStream();
      stream.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_XML) {
          stream.pause();
          reject(new AppError("Dit document bevat te veel uitgepakte tekst."));
          return;
        }
        chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      stream.resume();
    });
    if (/<!DOCTYPE|<!ENTITY/i.test(content))
      throw new AppError("Dit document bevat niet-ondersteunde XML.");
    return new DOMParser({
      errorHandler: {
        warning() {},
        error() {
          throw new Error("Invalid XML");
        },
        fatalError() {
          throw new Error("Invalid XML");
        },
      },
    }).parseFromString(content, "application/xml");
  }
  const parts: string[] = [];
  let textLength = 0;
  function add(text: string) {
    textLength += text.length;
    if (textLength > 100000)
      throw new AppError(
        "Dit document bevat te veel tekst. Gebruik maximaal 100.000 tekens per document.",
      );
    parts.push(text);
  }
  const byNumber = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true });
  if (format === ".pptx") {
    const slides = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(byNumber);
    if (!slides.length) throw new Error("Invalid presentation");
    for (const [index, name] of slides.entries()) {
      const doc = await xml(name);
      const paragraphs = Array.from(doc!.getElementsByTagNameNS("*", "p"));
      const text = paragraphs
        .map((p) =>
          Array.from(p.getElementsByTagNameNS("*", "t"))
            .map((t) => t.textContent || "")
            .join(""),
        )
        .filter(Boolean)
        .join("\n");
      if (text.trim()) add(`Dia ${index + 1}\n${text}`);
    }
  } else {
    const shared = await xml("xl/sharedStrings.xml");
    const strings = shared
      ? Array.from(shared.getElementsByTagNameNS("*", "si")).map((si) =>
          Array.from(si.getElementsByTagNameNS("*", "t"))
            .map((t) => t.textContent || "")
            .join(""),
        )
      : [];
    const workbook = await xml("xl/workbook.xml");
    const relationships = await xml("xl/_rels/workbook.xml.rels");
    if (!workbook || !relationships) throw new Error("Invalid workbook");
    const targets = new Map(
      Array.from(relationships.getElementsByTagNameNS("*", "Relationship"))
        .filter((r) => r.getAttribute("TargetMode") !== "External")
        .map((r) => [r.getAttribute("Id"), r.getAttribute("Target")]),
    );
    for (const sheet of Array.from(
      workbook.getElementsByTagNameNS("*", "sheet"),
    )) {
      const target = targets.get(sheet.getAttribute("r:id"));
      if (!target) continue;
      const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      if (!/^xl\/worksheets\/[^/]+\.xml$/.test(path)) continue;
      const doc = await xml(path);
      if (!doc) continue;
      const rows = Array.from(doc.getElementsByTagNameNS("*", "row"))
        .map((row) =>
          Array.from(row.getElementsByTagNameNS("*", "c"))
            .map((cell) => {
              const raw =
                cell.getElementsByTagNameNS("*", "v")[0]?.textContent || "";
              const type = cell.getAttribute("t");
              const value =
                type === "s"
                  ? strings[Number(raw)] || ""
                  : type === "inlineStr"
                    ? Array.from(cell.getElementsByTagNameNS("*", "t"))
                        .map((t) => t.textContent || "")
                        .join("")
                    : type === "b"
                      ? raw === "1"
                        ? "Ja"
                        : "Nee"
                      : raw;
              return value ? `${cell.getAttribute("r")}: ${value}` : "";
            })
            .filter(Boolean)
            .join(" | "),
        )
        .filter(Boolean)
        .join("\n");
      if (rows.trim())
        add(`${sheet.getAttribute("name") || "Werkblad"}\n${rows}`);
    }
  }
  return parts.join("\n\n");
}
