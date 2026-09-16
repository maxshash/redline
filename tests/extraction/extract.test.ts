import { describe, expect, it } from "vitest";
import {
  EXTRACTION_COPY,
  extractText,
  type ExtractionDeps,
  type ExtractionResult,
  type PdfJsModule,
} from "@/lib/extraction/extract";
import { mammothHtmlToText } from "@/lib/extraction/docx";
import { normalizeExtractedText } from "@/lib/extraction/normalize";
import { joinPdfPages, type PdfTextItem } from "@/lib/extraction/pdf";
import { buildDocx, buildImageOnlyPdf, buildPdfWithScannedPage, buildTextPdf } from "../support/document-files";
import { countOccurrences, loadFixture } from "../support/fixtures";

/** Node runs pdf.js's legacy build; the browser loads the modern one. The text logic is shared. */
const deps: ExtractionDeps = {
  loadPdfJs: async () => (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModule,
};

const encode = (text: string) => new TextEncoder().encode(text);

function expectText(result: ExtractionResult): string {
  if (!result.ok) throw new Error(`extraction failed: ${result.reason}`);
  return result.text;
}

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");

/** Every sentence a later ticket will cite from this fixture. */
function citedSentences(fixture: typeof adhesion): string[] {
  return [
    ...fixture.sidecar.plantedClauses.map((c) => c.sentence),
    ...fixture.sidecar.redLineCases.map((c) => c.matchingSentence),
    ...fixture.sidecar.questions.supported.map((q) => q.supportingSentence),
  ];
}

describe("plain text and Markdown", () => {
  it("returns the fixture unchanged apart from the trailing newline", async () => {
    for (const fixture of [adhesion, clean]) {
      const text = expectText(
        await extractText({ name: `${fixture.name}.txt`, type: "text/plain", bytes: encode(fixture.text) }, deps),
      );
      expect(text).toBe(fixture.text.trim());
    }
  });

  it("applies only the documented whitespace normalisation", async () => {
    const raw = "\uFEFF  Title\r\n\r\n\r\n\r\nClause\u00A0one\t says  \u201Cthis\u201D \u2014 and-that.   \r\nNext line\u00AD.\n\n\n";
    const result = await extractText({ name: "notes.md", type: "", bytes: encode(raw) }, deps);
    expect(expectText(result)).toBe("Title\n\nClause one says \u201Cthis\u201D \u2014 and-that.\nNext line.");
    expect(result).toMatchObject({ kind: "text" });
  });

  it("reads UTF-16 text with a byte order mark", async () => {
    const utf16 = new Uint8Array([0xff, 0xfe, ...Array.from("Hi.").flatMap((c) => [c.charCodeAt(0), 0])]);
    expect(expectText(await extractText({ name: "a.txt", type: "text/plain", bytes: utf16 }, deps))).toBe("Hi.");
  });

  it("rejects an empty or whitespace-only file", async () => {
    expect(await extractText({ name: "a.txt", type: "text/plain", bytes: encode(" \n\t ") }, deps)).toMatchObject({
      ok: false,
      reason: "empty",
    });
  });

  it("rejects binary junk named .txt instead of passing on garbage", async () => {
    const junk = new Uint8Array(400).map((_, i) => 0x80 + (i % 60));
    expect(await extractText({ name: "a.txt", type: "text/plain", bytes: junk }, deps)).toMatchObject({
      ok: false,
      reason: "unreadable",
    });
  });
});

describe("PDF", () => {
  it.each([adhesion, clean])("keeps every cited sentence of $name intact", async (fixture) => {
    const bytes = buildTextPdf(fixture.text);
    const text = expectText(await extractText({ name: "contract.pdf", type: "application/pdf", bytes }, deps));

    for (const sentence of citedSentences(fixture)) {
      expect(countOccurrences(text, sentence), sentence).toBe(1);
    }
    // Paragraphs survive as paragraphs, not one run-on block.
    expect(text.startsWith("MASTER CONSULTING SERVICES AGREEMENT\n\n") || fixture !== adhesion).toBe(true);
    expect(text.split("\n\n").length).toBeGreaterThan(20);
  }, 30_000);

  it("produces the same words as the source, with nothing glued or split", async () => {
    const text = expectText(
      await extractText({ name: "contract.pdf", type: "application/pdf", bytes: buildTextPdf(adhesion.text) }, deps),
    );
    const words = (value: string) => value.split(/\s+/).filter(Boolean);
    expect(words(text)).toEqual(words(adhesion.text));
  }, 30_000);

  it("rejects an image-only PDF as a scan", async () => {
    const result = await extractText({ name: "scan.pdf", type: "application/pdf", bytes: buildImageOnlyPdf() }, deps);
    expect(result).toEqual({ ok: false, reason: "scanned-pdf", message: EXTRACTION_COPY["scanned-pdf"] });
  });

  it("rejects a PDF with a scanned page rather than silently dropping that page", async () => {
    const bytes = buildPdfWithScannedPage(adhesion.text);
    expect(await extractText({ name: "signed.pdf", type: "application/pdf", bytes }, deps)).toEqual({
      ok: false,
      reason: "partly-scanned-pdf",
      message: EXTRACTION_COPY["partly-scanned-pdf"],
    });
  }, 30_000);

  it("rejects a file named .pdf that isn't one", async () => {
    expect(
      await extractText({ name: "contract.pdf", type: "application/pdf", bytes: encode("just words") }, deps),
    ).toMatchObject({ ok: false, reason: "unreadable" });
  });

  it("rejects a truncated PDF", async () => {
    const bytes = buildTextPdf(adhesion.text).slice(0, 300);
    expect(await extractText({ name: "contract.pdf", type: "application/pdf", bytes }, deps)).toMatchObject({
      ok: false,
      reason: "unreadable",
    });
  });
});

describe("joinPdfPages", () => {
  const item = (str: string, x: number, y: number, width: number, hasEOL = false): PdfTextItem => ({
    str,
    transform: [10, 0, 0, 10, x, y],
    width,
    height: 10,
    hasEOL,
  });

  it("restores a compound word wrapped after its hyphen, and a sentence carried onto the next page", () => {
    const text = joinPdfPages([
      [item("Notice by the then-", 72, 700, 114, true), item("current term ends", 72, 688, 102, true), item("the", 72, 676, 18, true)],
      [item("agreement.", 72, 700, 60, true), item("Next paragraph.", 72, 676, 90, true)],
    ]);
    expect(text).toBe("Notice by the then-current term ends the agreement.\n\nNext paragraph.");
  });

  it("inserts a space only where the geometry shows a gap", () => {
    const text = joinPdfPages([[item("Con", 72, 700, 18), item("sultant", 90, 700, 42), item("shall", 138, 700, 30)]]);
    expect(text).toBe("Consultant shall");
  });
});

describe("Word (.docx)", () => {
  it.each([adhesion, clean])("keeps every cited sentence of $name intact", async (fixture) => {
    const bytes = buildDocx(fixture.text);
    const text = expectText(
      await extractText(
        {
          name: "contract.docx",
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes,
        },
        deps,
      ),
    );
    for (const sentence of citedSentences(fixture)) {
      expect(countOccurrences(text, sentence), sentence).toBe(1);
    }
    expect(text).toBe(normalizeExtractedText(fixture.text));
  });

  it("keeps line breaks and escaped characters, and drops mammoth's footnote markers", () => {
    const html =
      '<p>ACME &amp; SONS LLC<br />By: Jane &lt;Doe&gt;</p><p>Fees are due<sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup> monthly.</p>' +
      '<ol><li id="footnote-1"><p>Net 30. <a href="#footnote-ref-1">\u2191</a></p></li></ol>';
    expect(normalizeExtractedText(mammothHtmlToText(html))).toBe(
      "ACME & SONS LLC\nBy: Jane <Doe>\n\nFees are due monthly.\n\nNet 30.",
    );
  });

  it("rejects a file named .docx that isn't a zip", async () => {
    expect(await extractText({ name: "a.docx", type: "", bytes: encode("hello there") }, deps)).toMatchObject({
      ok: false,
      reason: "unreadable",
    });
  });
});

describe("unsupported files", () => {
  it.each([
    ["photo.jpg", "image/jpeg", "image"],
    ["scan.png", "image/png", "image"],
    ["camera", "image/heic", "image"],
    ["old.doc", "application/msword", "legacy-word"],
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "unsupported-type"],
    ["page.html", "text/html", "unsupported-type"],
    ["noext", "application/octet-stream", "unsupported-type"],
  ])("rejects %s (%s) as %s without reading it", async (name, type, reason) => {
    let pdfLoaded = false;
    const result = await extractText(
      { name, type, bytes: encode("Some text that would otherwise be readable.") },
      { loadPdfJs: async () => ((pdfLoaded = true), deps.loadPdfJs()) },
    );
    expect(result).toEqual({ ok: false, reason, message: EXTRACTION_COPY[reason as keyof typeof EXTRACTION_COPY] });
    expect(pdfLoaded).toBe(false);
  });

  it("rejects a file over the size limit", async () => {
    const bytes = new Uint8Array(25 * 1024 * 1024 + 1);
    expect(await extractText({ name: "big.txt", type: "text/plain", bytes }, deps)).toMatchObject({
      ok: false,
      reason: "too-large",
    });
  });
});
