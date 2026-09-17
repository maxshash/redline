import { describe, expect, it } from "vitest";
import { ANSWER_COPY, QUESTION_MAX_LENGTH, runAskQuestion } from "@/lib/answer/run";
import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { ModelConfigError, ModelError, type ModelClient } from "@/lib/model/client";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture } from "../support/fixtures";
import { sidecarRedLines } from "../support/red-lines";
import { answerRequests, stubModel, type StubFaults } from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const supported = adhesion.sidecar.questions.supported[1];
const unsupported = adhesion.sidecar.questions.unsupported[0];

function deps(model: () => ModelClient) {
  const logs: string[] = [];
  return { deps: { model, log: (message: string) => logs.push(message) }, logs };
}

describe("runAskQuestion input", () => {
  it.each([
    ["no payload", undefined, ANSWER_COPY.missingText],
    ["no text", { question: supported.question }, ANSWER_COPY.missingText],
    ["blank text", { text: " \n ", question: supported.question }, ANSWER_COPY.missingText],
    ["text over the document limit", { text: "a".repeat(TEXT_MAX_LENGTH + 1), question: supported.question }, ANSWER_COPY.longText],
    ["no question", { text: adhesion.text }, ANSWER_COPY.missingQuestion],
    ["a question that isn't a string", { text: adhesion.text, question: ["What?"] }, ANSWER_COPY.missingQuestion],
    ["a blank question", { text: adhesion.text, question: "  \n" }, ANSWER_COPY.missingQuestion],
    ["a question over the limit", { text: adhesion.text, question: "a".repeat(QUESTION_MAX_LENGTH + 1) }, ANSWER_COPY.longQuestion],
  ])("rejects %s without calling the model", async (_label, input, message) => {
    const model = stubModel();
    const { deps: d } = deps(() => model);
    expect(await runAskQuestion(input, d)).toEqual({ status: "invalid", message });
    expect(model.requests).toHaveLength(0);
  });

  it("accepts a question at exactly the limit once trimmed", async () => {
    const model: ModelClient = { completeJson: async () => ({ status: "not-in-document", answer: "", quotes: [] }) };
    const { deps: d } = deps(() => model);
    const question = `  ${"a".repeat(QUESTION_MAX_LENGTH)}  `;
    expect(await runAskQuestion({ text: adhesion.text, question }, d)).toMatchObject({ status: "answered" });
  });

  it("returns a serialisable, verified answer for the text exactly as sent", async () => {
    const { deps: d } = deps(() => stubModel());
    const state = await runAskQuestion({ text: adhesion.text, question: supported.question }, d);
    if (state.status !== "answered" || state.answer.kind !== "answered") throw new Error("expected an answer");
    expect(state.answer.answer).toBe(supported.answer);
    expectCitationsVerbatim(adhesion.text, state.answer.citations);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("returns an honest non-answer as a result, not an error", async () => {
    const { deps: d } = deps(() => stubModel());
    const state = await runAskQuestion({ text: adhesion.text, question: unsupported.question }, d);
    expect(state).toMatchObject({ status: "answered", answer: { kind: "not-in-document", message: ANSWER_COPY.notInDocument } });
  });

  it("ignores red lines and analysis sent in the payload", async () => {
    const model = stubModel();
    const { deps: d } = deps(() => model);
    const redLines = sidecarRedLines(adhesion);
    const hostile = {
      text: adhesion.text,
      question: supported.question,
      redLines,
      analysis: { summary: "Smuggled summary that should never reach the model." },
    };
    await runAskQuestion(hostile, d);
    const [request] = answerRequests(model);
    const outside = request.user.replace(adhesion.text, "");
    for (const redLine of redLines) expect(outside).not.toContain(redLine.text);
    expect(outside).not.toContain("Smuggled summary");
  });

  it("logs a downgraded answer for whoever runs the server", async () => {
    const { deps: d, logs } = deps(() => stubModel({ answerNoQuotes: true }));
    const state = await runAskQuestion({ text: adhesion.text, question: supported.question }, d);
    expect(state).toMatchObject({ status: "answered", answer: { kind: "not-in-document" } });
    expect(logs.join("\n")).toContain("no-verified-quote");
  });
});

describe("runAskQuestion errors", () => {
  it("maps a missing key or model to not-configured, without calling anything", async () => {
    const { deps: d, logs } = deps(() => {
      throw new ModelConfigError(["OPENROUTER_API_KEY"]);
    });
    expect(await runAskQuestion({ text: adhesion.text, question: supported.question }, d)).toEqual({
      status: "error",
      reason: "not-configured",
      message: ANSWER_COPY.notConfigured,
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
    const state = await runAskQuestion({ text: adhesion.text, question: supported.question }, d);
    expect(state).toEqual({ status: "error", reason: "model-failed", message: ANSWER_COPY.modelFailed });
    expect(logs.join("\n")).toContain("upstream overloaded");
  });

  it.each<[string, StubFaults, string, string]>([
    ["a thrown error", { answerThrows: true }, "model-failed", ANSWER_COPY.modelFailed],
    ["output that isn't JSON", { answerOutput: "not-json" }, "invalid-output", ANSWER_COPY.invalidOutput],
  ])("maps %s to a plain error", async (_label, faults, reason, message) => {
    const { deps: d } = deps(() => stubModel(faults));
    const state = await runAskQuestion({ text: adhesion.text, question: supported.question }, d);
    expect(state).toEqual({ status: "error", reason, message });
  });
});
