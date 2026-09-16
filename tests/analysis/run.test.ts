import { describe, expect, it } from "vitest";
import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { ANALYSIS_COPY, runAnalyzeDocument } from "@/lib/analysis/run";
import { ModelConfigError, ModelError, type ModelClient } from "@/lib/model/client";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture } from "../support/fixtures";
import { stubModel, type StubFaults } from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");

function deps(model: () => ModelClient) {
  const logs: string[] = [];
  return { deps: { model, log: (message: string) => logs.push(message) }, logs };
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
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
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
