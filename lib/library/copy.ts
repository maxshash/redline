/** What a person reads in the library and on a saved document. Safe to import in the browser. */
export const LIBRARY_COPY = {
  loadFailed: "Couldn't load this document. Refresh the page to try again.",
  listFailed: "Couldn't load your documents. Refresh the page to try again.",
  signedOut: "Your session has ended. Sign in again to open your documents.",
  unavailable: "Accounts aren't open yet, so there's no library to open.",
  notFound: "That document isn't in your library.",
  needsRerun:
    "The saved check of this document no longer matches its text, so Redline isn't showing it. Run the check again.",
  rerun: "Check it again",
  noCheck: "Not checked yet",
  unverifiedCheck: "Needs a new check",
  noWarnings: "No warnings",
} as const;
