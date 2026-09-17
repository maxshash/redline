import { describe, expect, it } from "vitest";
import { hydrateStoredAnalysis, serializeAnalysis, serializeRedLinesUsed } from "@/lib/analysis/stored";
import { DOCUMENT_COPY, runSaveDocument } from "@/lib/documents/documents";
import { analyzeFixture, jsonCopy } from "../support/analyses";
import { expectCitationsVerbatim } from "../support/citations";
import { fakeDocumentStore } from "../support/fake-document-store";
import { loadFixture } from "../support/fixtures";

/**
 * Saving a document that was already checked: the browser sends the check
 * with the text, and the server re-verifies it against that text before
 * anything is stored.
 */

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");

async function payloadFor(text: string) {
  const { analysis, redLines } = await analyzeFixture("adhesion-contract");
  return {
    analysis,
    redLines,
    input: {
      title: "Brackenfold agreement",
      text,
      // What the browser sends: plain JSON, as a server action receives it.
      analysis: jsonCopy({ result: serializeAnalysis(analysis), redLinesUsed: serializeRedLinesUsed(redLines) }),
    },
  };
}

describe("runSaveDocument with an analysis", () => {
  it("stores the document, then the analysis with the red lines it ran with", async () => {
    const { input, analysis, redLines } = await payloadFor(adhesion.text);
    const store = fakeDocumentStore();

    const state = await runSaveDocument(input, store);

    expect(state).toMatchObject({ status: "saved", document: { id: "doc-1" }, analysis: "saved" });
    expect(store.inserts).toEqual([{ title: "Brackenfold agreement", text: adhesion.text }]);
    expect(store.analyses).toHaveLength(1);
    const [row] = store.analyses;
    expect(row.documentId).toBe("doc-1");
    expect(row.result).toEqual(serializeAnalysis(analysis));
    expect(row.redLinesUsed).toEqual(redLines);

    const reread = hydrateStoredAnalysis(adhesion.text, row);
    if (!reread.ok) throw new Error(`stored row should hydrate: ${reread.problem}`);
    expect(reread.analysis).toEqual(analysis);
    expectCitationsVerbatim(adhesion.text, reread.analysis);
  });

  it("refuses an analysis whose citations don't verify against the text being saved, and stores nothing", async () => {
    // A real analysis of the adhesion contract, sent along with the clean agreement's text.
    const { input } = await payloadFor(clean.text);
    const store = fakeDocumentStore();

    expect(await runSaveDocument(input, store)).toEqual({ status: "invalid", message: DOCUMENT_COPY.analysisMismatch });
    expect(store.inserts).toEqual([]);
    expect(store.analysisInserts).toEqual([]);
  });

  it("refuses a tampered citation, and stores nothing", async () => {
    const { input } = await payloadFor(adhesion.text);
    const flag = (input.analysis.result as { flags: { citation: { text: string } }[] }).flags[0];
    flag.citation.text = `${flag.citation.text.slice(0, -1)}!`;
    const store = fakeDocumentStore();

    expect(await runSaveDocument(input, store)).toMatchObject({ status: "invalid" });
    expect(store.inserts).toEqual([]);
    expect(store.analysisInserts).toEqual([]);
  });

  it("refuses red-line matches for red lines the payload doesn't say it ran with", async () => {
    const { input } = await payloadFor(adhesion.text);
    input.analysis.redLinesUsed = [];
    const store = fakeDocumentStore();

    expect(await runSaveDocument(input, store)).toMatchObject({ status: "invalid" });
    expect(store.inserts).toEqual([]);
  });

  it.each([
    ["a string", "analysis"],
    ["an empty object", {}],
    ["a result with no red lines list", { result: {} }],
  ])("refuses %s as the analysis, and stores nothing", async (_label, analysis) => {
    const store = fakeDocumentStore();
    expect(await runSaveDocument({ title: "Lease", text: adhesion.text, analysis }, store)).toMatchObject({ status: "invalid" });
    expect(store.inserts).toEqual([]);
  });

  it("keeps the document and says so when only the analysis insert fails", async () => {
    const { input } = await payloadFor(adhesion.text);
    const store = fakeDocumentStore({ analysisInsertFails: true });
    expect(await runSaveDocument(input, store)).toMatchObject({ status: "saved", analysis: "failed" });
    expect(store.inserts).toHaveLength(1);
    expect(store.analyses).toEqual([]);
  });

  it("checks nothing and reports nothing about an analysis when none is sent", async () => {
    const store = fakeDocumentStore();
    const state = await runSaveDocument({ title: "Lease", text: adhesion.text }, store);
    expect(state).toEqual({ status: "saved", document: { id: "doc-1", title: "Lease", createdAt: "2026-09-16T12:00:00Z" } });
    expect(store.analysisInserts).toEqual([]);
  });

  it("doesn't look at the analysis for a signed-out visitor or without Supabase", async () => {
    const { input } = await payloadFor(clean.text);
    expect(await runSaveDocument(input, null)).toEqual({ status: "unavailable" });
    const store = fakeDocumentStore({ userId: null });
    expect(await runSaveDocument(input, store)).toEqual({ status: "signed-out" });
    expect(store.inserts).toEqual([]);
  });
});
