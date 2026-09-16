import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";

/** What a person reads when an analysis can't run. Safe to import in the browser. */
export const ANALYSIS_COPY = {
  missingText: "There's no text to check.",
  longText: `This document is too long to check. The limit is ${TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`,
  notConfigured: "Document checks aren't set up on this server yet, so Redline can't read this one.",
  modelFailed: "Redline couldn't finish reading this document. Try again in a minute.",
  invalidOutput: "Redline got back an analysis it couldn't check against your document, so none of it is shown. Try again.",
} as const;
