import { extractText, type ExtractionResult, type PdfJsModule } from "./extract";

/**
 * The browser side of extraction: reads a picked File into bytes in memory
 * and hands them to `extractText`. Nothing here sends the file anywhere.
 */

let pdfJs: Promise<PdfJsModule> | null = null;

/** Load pdf.js once, with its worker running from this app's own bundle. */
function loadBrowserPdfJs(): Promise<PdfJsModule> {
  pdfJs ??= import("pdfjs-dist").then((module) => {
    if (!module.GlobalWorkerOptions.workerPort) {
      module.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    }
    return module as unknown as PdfJsModule;
  });
  return pdfJs;
}

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractText({ name: file.name, type: file.type, bytes }, { loadPdfJs: loadBrowserPdfJs });
}
