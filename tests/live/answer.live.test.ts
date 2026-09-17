import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/answer/answer";
import { modelClientFromEnv } from "@/lib/model/client";
import { expectCitationsVerbatim } from "../support/citations";
import { FIXTURE_NAMES, loadFixture } from "../support/fixtures";

/**
 * The live eval for the question box: the real model through OpenRouter, on
 * both fixtures' sidecar questions. Run with `npm run eval`. Costs money.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
if (!hasKey) {
  console.warn("Live answer eval skipped: OPENROUTER_API_KEY is not set. Add it to .env.local or the environment to run it.");
}

describe.skipIf(!hasKey).each(FIXTURE_NAMES)("answerQuestion against the real model: %s", (name) => {
  const fixture = loadFixture(name);

  it.each(fixture.sidecar.questions.supported.map((q) => [q.question, q] as const))(
    "answers from the document, citing the supporting sentence: %s",
    async (_question, supported) => {
      const answer = await answerQuestion(fixture.text, supported.question, { model: modelClientFromEnv() });
      console.info(name, supported.question, answer.kind, answer.verification);
      if (answer.kind !== "answered") throw new Error(`expected an answer, got ${answer.kind}: ${answer.message}`);

      expectCitationsVerbatim(fixture.text, answer.citations);
      const start = fixture.text.indexOf(supported.supportingSentence);
      const end = start + supported.supportingSentence.length;
      expect(
        answer.citations.some((citation) => citation.start < end && citation.end > start),
        `no citation overlaps: ${supported.supportingSentence}`,
      ).toBe(true);
    },
  );

  it.each(fixture.sidecar.questions.unsupported.map((q) => [q.question] as const))(
    "says the document doesn't answer: %s",
    async (question) => {
      const answer = await answerQuestion(fixture.text, question, { model: modelClientFromEnv() });
      console.info(name, question, answer.kind, answer.verification, answer.kind === "answered" ? answer.answer : "");
      expect(answer.kind).toBe("not-in-document");
      if (answer.kind === "not-in-document") expectCitationsVerbatim(fixture.text, answer.related);
    },
  );
});
