import { describe, expect, it } from "vitest";
import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { ANALYSIS_COPY, runAnalyzeDocument } from "@/lib/analysis/run";
import { ANALYSIS_SCHEMA_NAME } from "@/lib/analysis/prompt";
import { ModelConfigError, ModelError, type ModelClient } from "@/lib/model/client";
import type { RedLineStore } from "@/lib/red-lines/red-lines";
import { fakeRedLineStore, redLineRow } from "../support/fake-red-line-store";
import { sidecarRedLines } from "../support/red-lines";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture } from "../support/fixtures";
import { redLinesIn, stubModel, type StubFaults } from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");

function deps(model: () => ModelClient) {
  const logs: string[] = [];
  return { deps: { model, redLineStore: null, log: (message: string) => logs.push(message) }, logs };
}

describe("runAnalyzeDocument input", () => {
  it.each([
    ["no payload", undefined],
    ["no text", {}],
    ["text that isn't a string", { text: 42 }],
    ["blank text", { text: " \n " }],
  ])("rejects %s without calling the model", async (_label, input) => {
    const model = stubModel();
    const { deps: d } = deps(() => model);
    expect(await runAnalyzeDocument(input, d)).toEqual({ status: "invalid", message: ANALYSIS_COPY.missingText });
    expect(model.requests).toHaveLength(0);
  });

  it("rejects text over the document length limit", async () => {
    const model = stubModel();
    const { deps: d } = deps(() => model);
    const state = await runAnalyzeDocument({ text: "a".repeat(TEXT_MAX_LENGTH + 1) }, d);
    expect(state).toEqual({ status: "invalid", message: ANALYSIS_COPY.longText });
    expect(model.requests).toHaveLength(0);
  });

  it("returns a serialisable analysis of the text exactly as sent", async () => {
    const { deps: d } = deps(() => stubModel());
    const state = await runAnalyzeDocument({ text: adhesion.text }, d);
    if (state.status !== "analyzed") throw new Error(`expected an analysis, got ${state.status}`);
    expectCitationsVerbatim(
      adhesion.text,
      state.analysis.flags.map((flag) => flag.citation),
    );
    expect(state.analysis.verification).toMatchObject({ counterOffersDrafted: 8, counterOffersUnavailable: 0 });

    const received = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(received).toEqual(state);
    for (const flag of received.analysis.flags) {
      expect(flag.counterOffer.status).toBe("drafted");
      expect(adhesion.sidecar.plantedClauses.map((clause) => clause.counterOffer)).toContain(
        flag.counterOffer.status === "drafted" ? flag.counterOffer.proposedLanguage : null,
      );
    }
  });

  it("still returns the analysis when only the counter-offer call fails, and logs why", async () => {
    const { deps: d, logs } = deps(() => stubModel({ counterOfferThrows: true }));
    const state = await runAnalyzeDocument({ text: adhesion.text }, d);
    if (state.status !== "analyzed") throw new Error(`expected an analysis, got ${state.status}`);
    expect(state.analysis.flags).toHaveLength(8);
    expect(state.analysis.flags.every((flag) => flag.counterOffer.status === "unavailable")).toBe(true);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(logs.join("\n")).toContain("simulated counter-offer failure");
  });
});

describe("runAnalyzeDocument errors", () => {
  it("maps a missing key or model to not-configured, without calling anything", async () => {
    const { deps: d, logs } = deps(() => {
      throw new ModelConfigError(["OPENROUTER_API_KEY"]);
    });
    expect(await runAnalyzeDocument({ text: adhesion.text }, d)).toEqual({
      status: "error",
      reason: "not-configured",
      message: ANALYSIS_COPY.notConfigured,
    });
    expect(logs.join("\n")).toContain("OPENROUTER_API_KEY");
  });

  it("maps a failed model call to model-failed, keeping the provider's text out of the message", async () => {
    const failing: ModelClient = {
      async completeJson() {
        throw new ModelError("http", "OpenRouter returned 503: upstream overloaded.", { status: 503 });
      },
    };
    const { deps: d, logs } = deps(() => failing);
    const state = await runAnalyzeDocument({ text: adhesion.text }, d);
    expect(state).toEqual({ status: "error", reason: "model-failed", message: ANALYSIS_COPY.modelFailed });
    expect(logs.join("\n")).toContain("upstream overloaded");
  });

  it.each<[string, StubFaults, string]>([
    ["a thrown error", { throws: true }, "model-failed"],
    ["output that isn't JSON", { output: "not-json" }, "invalid-output"],
    ["output with no summary", { output: "no-summary" }, "invalid-output"],
  ])("maps %s to a plain error", async (_label, faults, reason) => {
    const { deps: d } = deps(() => stubModel(faults));
    const state = await runAnalyzeDocument({ text: adhesion.text }, d);
    expect(state).toMatchObject({ status: "error", reason });
  });
});

describe("runAnalyzeDocument red lines", () => {
  const storeRows = sidecarRedLines(adhesion).map((r) => redLineRow(r.text));

  function withStore(store: RedLineStore | null, model = stubModel()) {
    return { model, deps: { model: () => model, redLineStore: store, log: () => {} } };
  }

  function sentRedLines(model: ReturnType<typeof stubModel>) {
    return redLinesIn(model.requests.find((r) => r.name === ANALYSIS_SCHEMA_NAME)!);
  }

  it("uses only the store's red lines and ignores any sent from the client", async () => {
    const store = fakeRedLineStore({ rows: storeRows });
    const { model, deps: d } = withStore(store);
    const hostile = {
      text: adhesion.text,
      redLines: [{ id: "evil", text: "Anything that stops me working with other clients" }],
      redLineIds: ["evil"],
    };
    const state = await runAnalyzeDocument(hostile, d);
    if (state.status !== "analyzed") throw new Error(`expected an analysis, got ${state.status}`);

    expect(sentRedLines(model).map((r) => r.text)).toEqual(storeRows.map((r) => r.text));
    expect(state.redLines).toEqual({ status: "loaded", count: 3 });
    expect(state.analysis.redLineMatches.map((m) => m.redLine.id).sort()).toEqual(storeRows.map((r) => r.id).sort());
    expect(state.analysis.redLineMatches.some((m) => m.redLine.id === "evil")).toBe(false);
    expectCitationsVerbatim(adhesion.text, state.analysis);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("runs with no red lines when the client sends some but the user has none", async () => {
    const { model, deps: d } = withStore(fakeRedLineStore({ rows: [] }));
    const state = await runAnalyzeDocument({ text: adhesion.text, redLines: storeRows }, d);
    expect(sentRedLines(model)).toEqual([]);
    expect(state).toMatchObject({ status: "analyzed", redLines: { status: "loaded", count: 0 } });
  });

  it.each<[string, RedLineStore | null, string]>([
    ["signed out", fakeRedLineStore({ userId: null, rows: storeRows }), "signed-out"],
    ["Supabase isn't configured", null, "unavailable"],
    ["the red lines can't be read", fakeRedLineStore({ listFails: true, rows: storeRows }), "failed"],
  ])("still analyses with no red lines when %s, and says why", async (_label, store, status) => {
    const { model, deps: d } = withStore(store);
    const state = await runAnalyzeDocument({ text: adhesion.text, redLines: storeRows }, d);
    expect(sentRedLines(model)).toEqual([]);
    expect(state).toMatchObject({ status: "analyzed", redLines: { status } });
    if (state.status === "analyzed") {
      expect(state.analysis.redLineMatches).toEqual([]);
      expect(state.analysis.flags).toHaveLength(8);
    }
  });

  it("still analyses when reading the red lines throws", async () => {
    const store = fakeRedLineStore({ rows: storeRows });
    store.listForUser = async () => {
      throw new Error("connection reset");
    };
    const logs: string[] = [];
    const model = stubModel();
    const state = await runAnalyzeDocument({ text: adhesion.text }, { model: () => model, redLineStore: store, log: (m) => logs.push(m) });
    expect(state).toMatchObject({ status: "analyzed", redLines: { status: "failed" } });
    expect(logs.join("\n")).toContain("connection reset");
  });

  it("doesn't read red lines for input it rejects", async () => {
    const store = fakeRedLineStore({ rows: storeRows });
    const { deps: d } = withStore(store);
    await runAnalyzeDocument({ text: "  " }, d);
    expect(store.lists).toBe(0);
  });
});
