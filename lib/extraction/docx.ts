/**
 * Word documents.
 *
 * mammoth's `extractRawText` drops line breaks (Shift+Enter) entirely, so a
 * signature block like "ACME LLC<br>By: Jane Doe" comes back as "ACME LLCBy:
 * Jane Doe", with words glued together. mammoth's HTML output keeps those
 * breaks, and mammoth writes a small, predictable subset of HTML (it only
 * escapes &, <, > and "), so it is turned back into text here without a DOM.
 */

type MammothModule = typeof import("mammoth");

const BLOCK_END = /<\/(?:p|h[1-6]|li|td|th|tr|table|ol|ul|dd|dt|dl)>/g;

/** Footnote and endnote markers mammoth adds ("[1]" and the "↑" back-links); not document text. */
const NOTE_LINKS = /<sup><a href="#(?:footnote|endnote)-\d+" id="(?:footnote|endnote)-ref-\d+">[^<]*<\/a><\/sup>|<a href="#(?:footnote|endnote)-ref-\d+">[^<]*<\/a>/g;

export function mammothHtmlToText(html: string): string {
  return html
    .replace(NOTE_LINKS, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(BLOCK_END, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

export async function readDocxText(bytes: Uint8Array): Promise<string> {
  const mammoth: MammothModule = await import("mammoth");
  const arrayBuffer = bytes.slice().buffer;
  // mammoth's browser build reads `arrayBuffer`; its Node build reads `buffer`
  // and accepts an ArrayBuffer there too. Passing both lets the same call run
  // in the browser and in the Node test suite.
  const input = { arrayBuffer, buffer: arrayBuffer } as unknown as { arrayBuffer: ArrayBuffer };
  const result = await mammoth.convertToHtml(input, {
    // Images are never read or encoded; only text matters here.
    convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
  });
  return mammothHtmlToText(result.value);
}
