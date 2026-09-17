import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prepareAnalysisRecord, serializeAnalysis, serializeRedLinesUsed } from "@/lib/analysis/stored";
import type { JsonRequest, ModelClient } from "@/lib/model/client";
import {
  LIBRARY_COPY,
  analyzeSavedDocument,
  listLibrary,
  openSavedDocument,
  tallyFlags,
  tallyLabel,
  type LibraryDeps,
} from "@/lib/library/library";
import { analyzeFixture, jsonCopy, keptDocument } from "../support/analyses";
import { expectCitationsVerbatim } from "../support/citations";
import { fakeDocumentStore, type FakeAnalysisRow } from "../support/fake-document-store";
import { fakeRedLineStore, redLineRow } from "../support/fake-red-line-store";
import { loadFixture } from "../support/fixtures";
import { sidecarRedLines } from "../support/red-lines";
import { stubModel } from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");

/** A model client that records every call and fails loudly if used at all. */
function forbiddenModel() {
  const calls: JsonRequest[] = [];
  let built = 0;
  const client: ModelClient = {
    async completeJson(request) {
      calls.push(request);
      throw new Error("the model must not be called here");
    },
  };
  return {
    calls,
    get built() {
      return built;
    },
    factory: () => {
      built++;
      return client;
    },
  };
}

function deps(overrides: Partial<LibraryDeps> & Pick<LibraryDeps, "store">): LibraryDeps & { logs: string[] } {
  const logs: string[] = [];
  return {
    model: forbiddenModel().factory,
    redLineStore: null,
    log: (message) => logs.push(message),
    logs,
    ...overrides,
  };
}

/** A stored analyses row for a document, written through the same record check the app uses. */
async function storedRow(documentId: string, createdAt = "2026-09-11T10:00:00Z"): Promise<FakeAnalysisRow & { analysis: Awaited<ReturnType<typeof analyzeFixture>>["analysis"] }> {
  const { fixture, analysis, redLines } = await analyzeFixture("adhesion-contract");
  const prepared = prepareAnalysisRecord(fixture.text, analysis, redLines);
  if (!prepared.ok) throw new Error("fixture analysis should verify");
  return {
    id: randomUUID(),
    documentId,
    result: jsonCopy(prepared.record.result),
    redLinesUsed: jsonCopy(prepared.record.redLinesUsed),
    createdAt,
    analysis,
  };
}

describe("openSavedDocument", () => {
  it("returns the stored analysis unchanged and makes no model call", async () => {
    const document = keptDocument(adhesion);
    const row = await storedRow(document.id);
    const store = fakeDocumentStore({ documents: [document], analyses: [row] });
    const model = forbiddenModel();

    const state = await openSavedDocument(document.id, deps({ store, model: model.factory }));

    if (state.status !== "found" || state.check.status !== "saved") throw new Error(`expected a saved check, got ${JSON.stringify(state).slice(0, 80)}`);
    expect(state.document).toEqual(document);
    expect(state.check.analysis).toEqual(row.analysis);
    expect(state.check.redLinesUsed).toEqual(sidecarRedLines(adhesion));
    expect(state.check.checkedAt).toBe(row.createdAt);
    expectCitationsVerbatim(document.text, state.check.analysis);
    expect(model.calls).toHaveLength(0);
    expect(model.built).toBe(0);
  });

  it("shows the latest of several saved analyses", async () => {
    const document = keptDocument(adhesion);
    const older = await storedRow(document.id, "2026-09-11T10:00:00Z");
    const newer = await storedRow(document.id, "2026-09-12T10:00:00Z");
    (newer.result as { summary: string }).summary = "A later summary of the same document.";
    const store = fakeDocumentStore({ documents: [document], analyses: [older, newer] });

    const state = await openSavedDocument(document.id, deps({ store }));
    expect(state).toMatchObject({ status: "found", check: { status: "saved", checkedAt: newer.createdAt } });
    if (state.status === "found" && state.check.status === "saved") {
      expect(state.check.analysis.summary).toBe("A later summary of the same document.");
    }
  });

  it("says a document with no saved analysis has none", async () => {
    const document = keptDocument(clean);
    const state = await openSavedDocument(document.id, deps({ store: fakeDocumentStore({ documents: [document] }) }));
    expect(state).toEqual({ status: "found", document, check: { status: "none" } });
  });

  it("asks for a rerun, and shows nothing, when the saved analysis fails hydration", async () => {
    const document = keptDocument(adhesion);
    const row = await storedRow(document.id);
    const result = row.result as { flags: { citation: { start: number; end: number } }[] };
    result.flags[0].citation.start += 2;
    result.flags[0].citation.end += 2;
    const store = fakeDocumentStore({ documents: [document], analyses: [row] });
    const model = forbiddenModel();
    const d = deps({ store, model: model.factory });

    const state = await openSavedDocument(document.id, d);
    expect(state).toEqual({ status: "found", document, check: { status: "needs-rerun", checkedAt: row.createdAt } });
    expect(d.logs.join("\n")).toContain("citation-mismatch");
    expect(model.calls).toHaveLength(0);
  });

  it("asks for a rerun when the document's text no longer matches its analysis", async () => {
    const document = keptDocument(clean);
    const row = await storedRow(document.id); // an analysis of the adhesion contract, filed under the clean one
    const state = await openSavedDocument(document.id, deps({ store: fakeDocumentStore({ documents: [document], analyses: [row] }) }));
    expect(state).toMatchObject({ status: "found", check: { status: "needs-rerun" } });
  });

  it.each([
    ["an unknown id", randomUUID()],
    ["an id that isn't a uuid", "not-a-document"],
    ["no id at all", undefined],
  ])("returns not-found for %s, without touching the model", async (_label, id) => {
    const model = forbiddenModel();
    const store = fakeDocumentStore({ documents: [keptDocument(adhesion)] });
    expect(await openSavedDocument(id, deps({ store, model: model.factory }))).toEqual({ status: "not-found" });
    expect(model.calls).toHaveLength(0);
  });

  it("reports a failed read as a failure, not as not-found", async () => {
    const store = fakeDocumentStore({ readFails: true });
    expect(await openSavedDocument(randomUUID(), deps({ store }))).toEqual({ status: "failed", message: LIBRARY_COPY.loadFailed });
  });

  it("is unavailable without Supabase and signed-out without a session", async () => {
    expect(await openSavedDocument(randomUUID(), deps({ store: null }))).toMatchObject({ status: "unavailable" });
    expect(await openSavedDocument(randomUUID(), deps({ store: fakeDocumentStore({ userId: null }) }))).toMatchObject({
      status: "signed-out",
    });
  });
});

describe("analyzeSavedDocument", () => {
  const storeRows = sidecarRedLines(adhesion).map((r) => redLineRow(r.text));

  it("checks the stored text, saves the result with the red lines it ran with, and reopens it without a model call", async () => {
    const document = keptDocument(adhesion);
    const store = fakeDocumentStore({ documents: [document] });
    const model = stubModel();
    const state = await analyzeSavedDocument(
      // Only the id is used; text and red lines in the payload are ignored.
      { documentId: document.id, text: clean.text, redLines: [{ id: "evil", text: "Anything" }] },
      deps({ store, model: () => model, redLineStore: fakeRedLineStore({ rows: storeRows }) }),
    );

    if (state.status !== "analyzed") throw new Error(`expected an analysis, got ${state.status}`);
    expect(model.lastFixture?.name).toBe("adhesion-contract");
    expectCitationsVerbatim(adhesion.text, state.analysis);
    expect(state.saved).not.toBeNull();

    expect(store.analysisInserts).toHaveLength(1);
    const { documentId, record } = store.analysisInserts[0] as { documentId: string; record: { result: unknown; redLinesUsed: unknown } };
    expect(documentId).toBe(document.id);
    expect(record.result).toEqual(serializeAnalysis(state.analysis));
    expect(record.redLinesUsed).toEqual(serializeRedLinesUsed(storeRows.map(({ id, text }) => ({ id, text }))));

    const callsBefore = model.requests.length;
    const reopened = await openSavedDocument(document.id, deps({ store, model: () => model }));
    expect(reopened).toMatchObject({ status: "found", check: { status: "saved", checkedAt: state.saved?.createdAt } });
    if (reopened.status === "found" && reopened.check.status === "saved") {
      expect(reopened.check.analysis).toEqual(state.analysis);
      expect(reopened.check.redLinesUsed.map((r) => r.text)).toEqual(storeRows.map((r) => r.text));
    }
    expect(model.requests).toHaveLength(callsBefore);
  });

  it("still returns the check when storing it fails, and says it wasn't saved", async () => {
    const document = keptDocument(adhesion);
    const store = fakeDocumentStore({ documents: [document], analysisInsertFails: true });
    const state = await analyzeSavedDocument({ documentId: document.id }, deps({ store, model: () => stubModel() }));
    expect(state).toMatchObject({ status: "analyzed", saved: null });
    expect(store.analyses).toEqual([]);
  });

  it("returns not-found for someone else's or a missing document, and calls nothing", async () => {
    const model = forbiddenModel();
    const store = fakeDocumentStore({ documents: [] });
    expect(await analyzeSavedDocument({ documentId: randomUUID() }, deps({ store, model: model.factory }))).toEqual({
      status: "not-found",
      message: LIBRARY_COPY.notFound,
    });
    expect(model.built).toBe(0);
    expect(store.analysisInserts).toEqual([]);
  });

  it("stores nothing when the model call fails", async () => {
    const document = keptDocument(adhesion);
    const store = fakeDocumentStore({ documents: [document] });
    const state = await analyzeSavedDocument({ documentId: document.id }, deps({ store, model: () => stubModel({ throws: true }) }));
    expect(state).toMatchObject({ status: "error", reason: "model-failed" });
    expect(store.analysisInserts).toEqual([]);
  });

  it("is unavailable without Supabase and signed-out without a session, without calling the model", async () => {
    const model = forbiddenModel();
    expect(await analyzeSavedDocument({ documentId: randomUUID() }, deps({ store: null, model: model.factory }))).toMatchObject({
      status: "unavailable",
    });
    expect(
      await analyzeSavedDocument({ documentId: randomUUID() }, deps({ store: fakeDocumentStore({ userId: null }), model: model.factory })),
    ).toMatchObject({ status: "signed-out" });
    expect(model.built).toBe(0);
  });
});

describe("listLibrary", () => {
  it("lists every document newest first, tallying each latest analysis from its stored flags", async () => {
    const checked = keptDocument(adhesion, { title: "Brackenfold", createdAt: "2026-09-12T08:00:00Z" });
    const unchecked = keptDocument(clean, { title: "Larkspur", createdAt: "2026-09-14T08:00:00Z" });
    const broken = keptDocument(adhesion, { title: "Edited by hand", createdAt: "2026-09-01T08:00:00Z" });
    const row = await storedRow(checked.id);
    const brokenRow = await storedRow(broken.id);
    (brokenRow.result as { flags: { severity: unknown }[] }).flags[0].severity = 9;

    const store = fakeDocumentStore({ documents: [broken, checked, unchecked], analyses: [row, brokenRow] });
    const model = forbiddenModel();
    const state = await listLibrary({ ...deps({ store, model: model.factory }) });

    if (state.status !== "listed") throw new Error(`expected a list, got ${state.status}`);
    expect(state.documents.map((d) => d.title)).toEqual(["Larkspur", "Brackenfold", "Edited by hand"]);

    const expected = { critical: 0, serious: 0, "worth-noting": 0 };
    for (const flag of row.analysis.flags) expected[flag.severity]++;
    // The planted contract has a flag in every tier, so the tally has something to count.
    expect(expected.critical).toBeGreaterThan(0);
    expect(expected.serious).toBeGreaterThan(0);

    expect(state.documents[0].check).toEqual({ status: "none" });
    expect(state.documents[1].check).toEqual({ status: "saved", tally: expected, checkedAt: row.createdAt });
    expect(state.documents[2].check).toEqual({ status: "needs-rerun", checkedAt: brokenRow.createdAt });
    expect(model.calls).toHaveLength(0);
  });

  it("tallies what is stored, not what the fixture expects", async () => {
    const document = keptDocument(adhesion);
    const row = await storedRow(document.id);
    const result = row.result as { flags: { severity: string }[] };
    for (const flag of result.flags) flag.severity = "worth-noting";
    const store = fakeDocumentStore({ documents: [document], analyses: [row] });

    const state = await listLibrary({ store });
    expect(state).toMatchObject({
      status: "listed",
      documents: [{ check: { status: "saved", tally: { critical: 0, serious: 0, "worth-noting": result.flags.length } } }],
    });
  });

  it("reports a failed read, a missing session and missing Supabase", async () => {
    expect(await listLibrary({ store: fakeDocumentStore({ readFails: true }) })).toEqual({
      status: "failed",
      message: LIBRARY_COPY.listFailed,
    });
    expect(await listLibrary({ store: fakeDocumentStore({ userId: null }) })).toMatchObject({ status: "signed-out" });
    expect(await listLibrary({ store: null })).toMatchObject({ status: "unavailable" });
  });
});

describe("tally labels", () => {
  it("names tiers heaviest first, leaves out empty ones, and never gives a score", () => {
    const flags = [{ severity: "serious" }, { severity: "critical" }, { severity: "critical" }] as const;
    expect(tallyLabel(tallyFlags(flags))).toBe("2 critical · 1 serious");
    expect(tallyLabel(tallyFlags([{ severity: "worth-noting" }]))).toBe("1 worth noting");
    expect(tallyLabel(tallyFlags([]))).toBe(LIBRARY_COPY.noWarnings);
  });
});
