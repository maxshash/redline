import { crc32 } from "node:zlib";

/**
 * Real PDF and DOCX files built from plain text with Node built-ins only, so
 * extraction tests run against genuine file formats without committing
 * binaries or adding a dependency.
 *
 * The PDF is laid out the way a word processor prints one: text wrapped to a
 * measure, paragraphs separated by extra leading, and several pages. Half the
 * lines are drawn word by word at absolute positions with no space characters
 * between them, which is how many real PDFs store text, so the extractor has
 * to recover word gaps from geometry.
 */

// ---------------------------------------------------------------- PDF

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const FONT_SIZE = 10;
/** Courier is monospaced: every glyph advances 600/1000 of the font size. */
const CHAR_WIDTH = FONT_SIZE * 0.6;
const LEADING = 12;
const PARAGRAPH_GAP = 12;
const CHARS_PER_LINE = Math.floor((PAGE_WIDTH - 2 * MARGIN) / CHAR_WIDTH);

function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(paragraph: string, width: number): string[] {
  const words = paragraph.split(" ").filter((w) => w.length > 0);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      // Word processors break a hyphenated compound after its hyphen.
      const hyphen = word.lastIndexOf("-", width - line.length - 2);
      if (hyphen > 0 && hyphen < word.length - 1) {
        lines.push(`${line} ${word.slice(0, hyphen + 1)}`);
        line = word.slice(hyphen + 1);
      } else {
        lines.push(line);
        line = word;
      }
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

interface PdfObject {
  body: string;
}

/** Serialise objects 1..n into a PDF with a correct xref table. Object 1 must be the catalog. */
function writePdf(objects: PdfObject[]): Uint8Array {
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${index + 1} 0 obj\n${object.body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

function stream(content: string, dict = ""): string {
  return `<< ${dict} /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
}

/** Page content streams for `text`, one per page. Paragraphs are separated by blank lines. */
function layOutPages(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE_HEIGHT - MARGIN;
  let lineNumber = 0;

  const flush = () => {
    pages.push(ops.join("\n"));
    ops = [];
    y = PAGE_HEIGHT - MARGIN;
  };

  for (const paragraph of paragraphs) {
    for (const line of wrap(paragraph, CHARS_PER_LINE)) {
      if (y < MARGIN) flush();
      if (lineNumber % 2 === 0) {
        ops.push(`BT /F1 ${FONT_SIZE} Tf 1 0 0 1 ${MARGIN} ${y} Tm (${escapePdfString(line)}) Tj ET`);
      } else {
        // Word by word, positioned absolutely, with no space glyphs at all.
        let x = MARGIN;
        for (const word of line.split(" ")) {
          ops.push(`BT /F1 ${FONT_SIZE} Tf 1 0 0 1 ${x.toFixed(2)} ${y} Tm (${escapePdfString(word)}) Tj ET`);
          x += (word.length + 1) * CHAR_WIDTH;
        }
      }
      lineNumber++;
      y -= LEADING;
    }
    y -= PARAGRAPH_GAP;
  }
  if (ops.length > 0) flush();
  return pages;
}

function pagesPdf(contents: string[], resources: (pageIndex: number) => { dict: string; extra: PdfObject[] }): Uint8Array {
  // 1 catalog, 2 pages, then per page: page object, content stream, extras.
  const objects: PdfObject[] = [{ body: "<< /Type /Catalog /Pages 2 0 R >>" }, { body: "" }];
  const kids: number[] = [];
  contents.forEach((content, index) => {
    const pageNumber = objects.length + 1;
    const contentNumber = pageNumber + 1;
    const { dict, extra } = resources(index);
    kids.push(pageNumber);
    objects.push({
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentNumber} 0 R /Resources ${dict.replace(
        /\{(\d+)\}/g,
        (_, n) => String(contentNumber + 1 + Number(n)),
      )} >>`,
    });
    objects.push({ body: stream(content) });
    objects.push(...extra);
  });
  objects[1] = { body: `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>` };
  return writePdf(objects);
}

const COURIER = {
  dict: "<< /Font << /F1 {0} 0 R >> >>",
  extra: [{ body: "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>" }],
};

const SCANNED_PAGE = `q ${PAGE_WIDTH - 2 * MARGIN} 0 0 ${PAGE_HEIGHT - 2 * MARGIN} ${MARGIN} ${MARGIN} cm /Im0 Do Q`;

function scannedPageResources() {
  const pixels = "\x40\xC0\xC0\x40"; // 2 x 2 grey pixels
  return {
    dict: "<< /XObject << /Im0 {0} 0 R >> >>",
    extra: [
      { body: stream(pixels, "/Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8") },
    ],
  };
}

/** A multi-page text PDF of `text`, set in Courier. */
export function buildTextPdf(text: string): Uint8Array {
  return pagesPdf(layOutPages(text), () => COURIER);
}

/**
 * What a scanner produces: pages that paint one image each and carry no text
 * layer at all.
 */
export function buildImageOnlyPdf(pageCount = 2): Uint8Array {
  return pagesPdf(Array.from({ length: pageCount }, () => SCANNED_PAGE), scannedPageResources);
}

/** A text PDF of `text` with one scanned, text-less page appended (a signed exhibit, say). */
export function buildPdfWithScannedPage(text: string): Uint8Array {
  const pages = layOutPages(text);
  return pagesPdf([...pages, SCANNED_PAGE], (index) => (index < pages.length ? COURIER : scannedPageResources()));
}

// ---------------------------------------------------------------- DOCX

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A zip archive with stored (uncompressed) entries. */
function zipStored(entries: { name: string; data: Buffer }[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date: 1980-01-01
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, entry.data);
    centrals.push(central, name);
    offset += local.length + name.length + entry.data.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return new Uint8Array(Buffer.concat([...locals, centralBuffer, end]));
}

/**
 * A Word document with one paragraph per blank-line-separated paragraph of
 * `text`. Each paragraph is split across several runs, some breaking
 * mid-word, the way Word stores text after edits and spell-checks.
 */
export function buildDocx(text: string): Uint8Array {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter((p) => p.length > 0);

  const body = paragraphs
    .map((paragraph) => {
      // A single line break inside a paragraph (a signature block) is a <w:br/>.
      const lines = paragraph.split("\n");
      const runs = lines.flatMap((line, lineIndex) => {
        const pieces: string[] = [];
        for (let i = 0; i < line.length; i += 37) pieces.push(line.slice(i, i + 37));
        const texts = pieces.map(
          (piece, i) =>
            `<w:r>${i % 3 === 1 ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escapeXml(piece)}</w:t></w:r>`,
        );
        return lineIndex < lines.length - 1 ? [...texts, "<w:r><w:br/></w:r>"] : texts;
      });
      return `<w:p>${runs.join("")}</w:p>`;
    })
    .join("");

  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`,
  };

  return zipStored(Object.entries(files).map(([name, content]) => ({ name, data: Buffer.from(content, "utf8") })));
}
