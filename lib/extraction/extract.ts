import { countTextCharacters, normalizeExtractedText } from "./normalize";
import { readDocxText } from "./docx";
import { joinPdfPages, type PdfTextItem } from "./pdf";

/**
 * Pure text extraction. Takes a file's name, MIME type and bytes, and returns
 * the document's text or a plain reason it can't be read. It never uploads
 * anything and never guesses at text it can't read: there is no OCR, so a
 * scanned page is refused rather than passed on as mangled or missing text.
 *
 * pdf.js is passed in because its build and worker setup differ between the
 * browser and Node; the text logic here is the same in both.
 */

export interface ExtractionInput {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export type ExtractionFailureCode =
  | "unsupported-type"
  | "image"
  | "legacy-word"
  | "too-large"
  | "empty"
  | "unreadable"
  | "password-protected"
  | "scanned-pdf"
  | "partly-scanned-pdf";

export type ExtractionResult =
  | { ok: true; text: string; kind: DocumentKind }
  | { ok: false; reason: ExtractionFailureCode; message: string };

export type DocumentKind = "text" | "pdf" | "docx";

/** The slice of the pdf.js module this code uses. */
export interface PdfJsModule {
  getDocument(params: { data: Uint8Array; isEvalSupported?: boolean; verbosity?: number }): {
    promise: Promise<PdfDocument>;
    destroy(): Promise<void>;
  };
  OPS: {
    paintImageXObject: number;
    paintInlineImageXObject: number;
    paintImageXObjectRepeat: number;
    paintImageMaskXObject: number;
  };
}

interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}

interface PdfPage {
  getTextContent(): Promise<{ items: Array<PdfTextItem | { type: string }> }>;
  getOperatorList(): Promise<{ fnArray: number[] }>;
}

export interface ExtractionDeps {
  loadPdfJs: () => Promise<PdfJsModule>;
}

/** Files bigger than this are refused before anything tries to parse them. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** A page with fewer letters and digits than this has no real text layer. */
export const MIN_PAGE_TEXT_CHARACTERS = 20;

/** Share of replacement or private-use characters above which text is garbage. */
const MAX_GARBAGE_SHARE = 0.02;

export const EXTRACTION_COPY: Record<ExtractionFailureCode, string> = {
  "unsupported-type": "Redline reads PDF, Word (.docx), plain text and Markdown files. Try one of those, or paste the text.",
  image:
    "That's an image. Redline can't read text out of pictures or scans. Use a PDF or Word file with selectable text, or paste the text.",
  "legacy-word": "Redline can't read old .doc files. Open it in Word, save it as .docx or PDF, and try again.",
  "too-large": "That file is over 25 MB, which is too big to read here. Try a smaller copy, or paste the text.",
  empty: "There's no text in that file.",
  unreadable: "Redline couldn't read that file. It may be damaged, or not the type its name says.",
  "password-protected": "That PDF is password-protected. Remove the password, or paste the text instead.",
  "scanned-pdf":
    "This PDF has no selectable text, so it's probably a scan. Redline doesn't read scans, because a quote from misread text can't be checked. Use the original digital file, or paste the text.",
  "partly-scanned-pdf":
    "Some pages of this PDF are scans with no selectable text. Redline would miss what's on those pages, so it won't read the file. Use the original digital file, or paste the text.",
};

function fail(reason: ExtractionFailureCode, message = EXTRACTION_COPY[reason]): ExtractionResult {
  return { ok: false, reason, message };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

const TEXT_EXTENSIONS = new Set(["txt", "text", "md", "markdown"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/x-markdown"]);
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "tif", "tiff", "bmp", "avif", "svg"]);

type Detected = DocumentKind | Exclude<ExtractionFailureCode, "too-large" | "empty" | "unreadable" | "password-protected" | "scanned-pdf" | "partly-scanned-pdf">;

/** Decide the format from the extension first, then the MIME type. */
export function detectKind(name: string, type: string): Detected {
  const ext = extensionOf(name);
  const mime = type.toLowerCase().split(";")[0].trim();

  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (ext === "doc" || mime === "application/msword") return "legacy-word";
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith("image/")) return "image";
  if (ext === "") {
    if (mime === "application/pdf") return "pdf";
    if (mime === DOCX_TYPE) return "docx";
    if (TEXT_TYPES.has(mime)) return "text";
  }
  return "unsupported-type";
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** True when a meaningful share of the text is replacement or private-use characters. */
function looksGarbled(text: string): boolean {
  const bad = text.match(/[\uFFFD\uE000-\uF8FF]/g)?.length ?? 0;
  const visible = text.replace(/\s/g, "").length;
  return visible > 0 && bad / visible > MAX_GARBAGE_SHARE;
}

function decodeText(bytes: Uint8Array): string {
  if (startsWith(bytes, [0xff, 0xfe])) return new TextDecoder("utf-16le").decode(bytes);
  if (startsWith(bytes, [0xfe, 0xff])) return new TextDecoder("utf-16be").decode(bytes);
  // The same decoding File.text() does: UTF-8, with any byte order mark dropped.
  return new TextDecoder("utf-8").decode(bytes);
}

function finish(raw: string, kind: DocumentKind): ExtractionResult {
  const text = normalizeExtractedText(raw);
  if (text.length === 0) return fail("empty");
  if (looksGarbled(text)) return fail("unreadable");
  return { ok: true, text, kind };
}

async function extractPdf(bytes: Uint8Array, deps: ExtractionDeps): Promise<ExtractionResult> {
  // "%PDF-" may be preceded by a little junk; readers allow up to 1024 bytes.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) return fail("unreadable");

  const pdfjs = await deps.loadPdfJs();
  // pdf.js takes ownership of the buffer it is given, so hand it a copy.
  // Verbosity 0 keeps pdf.js to errors only; its font warnings are about
  // drawing glyphs, which extraction never does.
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 });
  let document: PdfDocument;
  try {
    document = await task.promise;
  } catch (error) {
    await task.destroy().catch(() => {});
    const name = (error as { name?: string } | null)?.name;
    return fail(name === "PasswordException" ? "password-protected" : "unreadable");
  }

  try {
    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintImageMaskXObject,
    ]);

    const pages: PdfTextItem[][] = [];
    let scannedPages = 0;
    let textPages = 0;

    for (let n = 1; n <= document.numPages; n++) {
      const page = await document.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is PdfTextItem => "str" in item);
      pages.push(items);

      const characters = countTextCharacters(items.map((item) => item.str).join(""));
      if (characters >= MIN_PAGE_TEXT_CHARACTERS) {
        textPages++;
        continue;
      }
      // Little or no text. If the page paints an image, it is a scanned page.
      const operators = await page.getOperatorList();
      if (operators.fnArray.some((op) => imageOps.has(op))) scannedPages++;
    }

    if (textPages === 0) return fail("scanned-pdf");
    if (scannedPages > 0) return fail("partly-scanned-pdf");
    return finish(joinPdfPages(pages), "pdf");
  } catch {
    return fail("unreadable");
  } finally {
    await task.destroy().catch(() => {});
  }
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractionResult> {
  // A .docx is a zip archive, which starts "PK\x03\x04".
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return fail("unreadable");
  try {
    return finish(await readDocxText(bytes), "docx");
  } catch {
    return fail("unreadable");
  }
}

export async function extractText(input: ExtractionInput, deps: ExtractionDeps): Promise<ExtractionResult> {
  const kind = detectKind(input.name, input.type);
  if (kind !== "text" && kind !== "pdf" && kind !== "docx") return fail(kind);
  if (input.bytes.byteLength > MAX_FILE_BYTES) return fail("too-large");
  if (input.bytes.byteLength === 0) return fail("empty");

  switch (kind) {
    case "text":
      return finish(decodeText(input.bytes), "text");
    case "pdf":
      return extractPdf(input.bytes, deps);
    case "docx":
      return extractDocx(input.bytes);
  }
}
