import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analysis/analyze";
import { COUNTER_OFFER_FLAGS_START, RED_LINES_START } from "@/lib/analysis/prompt";
import { AnswerError, answerQuestion } from "@/lib/answer/answer";
import { ANSWER_COPY, QUESTION_MAX_LENGTH } from "@/lib/answer/copy";
import type { Answer, AnswerVerification } from "@/lib/answer/types";
import { locateCitation, type Citation } from "@/lib/citations/citation";
import { figuresIn } from "@/lib/citations/support";
import { expectCitationsVerbatim } from "../support/citations";
import { FIXTURE_NAMES, loadFixture, type Fixture } from "../support/fixtures";
import { sidecarRedLines } from "../support/red-lines";
import {
  FABRICATED_QUOTE,
  INVENTED_ANSWER_FIGURE,
  INVENTED_CLAIM,
  STUB_NOT_IN_DOCUMENT,
  answerRequests,
  stubModel,
  type StubFaults,
} from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const firstSupported = adhesion.sidecar.questions.supported[0];
const firstUnsupported = adhesion.sidecar.questions.unsupported[0];

function spanOf(fixture: Fixture, sentence: string) {
  const start = fixture.text.indexOf(sentence);
  if (start === -1) throw new Error(`sidecar sentence not in ${fixture.name}`);
  return { start, end: start + sentence.length };
}

function overlaps(citation: Citation, span: { start: number; end: number }) {
  return citation.start < span.end && span.start < citation.end;
}

function ask(fixture: Fixture, question: string, faults: StubFaults = {}) {
  const model = stubModel(faults);
  return { model, result: answerQuestion(fixture.text, question, { model }) };
}

/** No field of a not-in-document answer holds the model's claim. */
function expectNoClaim(answer: Answer, ...claims: string[]) {
  expect(answer.kind).toBe("not-in-document");
  expect(Object.keys(answer).sort()).toEqual(["kind", "message", "related", "verification"]);
  const serialised = JSON.stringify(answer);
  for (const claim of claims) expect(serialised).not.toContain(claim);
}

describe.each(FIXTURE_NAMES)("answerQuestion on %s", (name) => {
  const fixture = loadFixture(name);

  it.each(fixture.sidecar.questions.supported.map((q) => [q.question, q] as const))(
    "answers a supported question from the document: %s",
    async (_question, supported) => {
      const answer = await ask(fixture, supported.question).result;
      if (answer.kind !== "answered") throw new Error(`expected an answer, got ${answer.kind}`);

      expect(answer.answer).toBe(supported.answer);
      expect(answer.citations.length).toBeGreaterThan(0);
      expectCitationsVerbatim(fixture.text, answer.citations);
      const span = spanOf(fixture, supported.supportingSentence);
      expect(answer.citations.every((citation) => overlaps(citation, span))).toBe(true);

      // Every figure in the answer is in what it cites.
      const cited = new Set(answer.citations.flatMap((citation) => figuresIn(citation.text)));
      for (const figure of figuresIn(answer.answer)) expect(cited.has(figure), `figure ${figure}`).toBe(true);

      expect(answer.verification).toEqual<AnswerVerification>({
        quotesProposed: 1,
        quotesKept: 1,
        quotesDropped: 0,
        quotesDuplicate: 0,
        downgraded: false,
        downgradeReason: null,
      });
    },
  );

  it.each(fixture.sidecar.questions.unsupported.map((q) => [q.question] as const))(
    "gives an honest non-answer to an unsupported question: %s",
    async (question) => {
      const answer = await ask(fixture, question).result;
      expectNoClaim(answer, STUB_NOT_IN_DOCUMENT);
      if (answer.kind !== "not-in-document") return;
      expect(answer.message).toBe(ANSWER_COPY.notInDocument);
      expect(answer.related).toEqual([]);
      expect(answer.verification.downgraded).toBe(false);
    },
  );
});

describe("answerQuestion faults", () => {
  const supportingSpan = spanOf(adhesion, firstSupported.supportingSentence);

  it("drops a fabricated quote next to a real one and still answers", async () => {
    const answer = await ask(adhesion, firstSupported.question, { answerFabricatedQuote: "extra" }).result;
    expect(answer.kind).toBe("answered");
    if (answer.kind !== "answered") return;
    expect(answer.citations.map((c) => c.text)).toEqual([firstSupported.supportingSentence]);
    expect(answer.verification).toMatchObject({ quotesProposed: 2, quotesKept: 1, quotesDropped: 1, downgraded: false });
    expect(JSON.stringify(answer)).not.toContain(FABRICATED_QUOTE);
  });

  it("downgrades an answer whose only quote is fabricated", async () => {
    const answer = await ask(adhesion, firstSupported.question, { answerFabricatedQuote: "only" }).result;
    expectNoClaim(answer, firstSupported.answer, FABRICATED_QUOTE);
    expect(answer).toMatchObject({ message: ANSWER_COPY.noVerifiedQuote, related: [] });
    expect(answer.verification).toEqual<AnswerVerification>({
      quotesProposed: 1,
      quotesKept: 0,
      quotesDropped: 1,
      quotesDuplicate: 0,
      downgraded: true,
      downgradeReason: "no-verified-quote",
    });
  });

  it("counts a repeated quote once", async () => {
    const answer = await ask(adhesion, firstSupported.question, { answerDuplicateQuote: true }).result;
    expect(answer.kind).toBe("answered");
    if (answer.kind !== "answered") return;
    expect(answer.citations).toHaveLength(1);
    expect(answer.verification).toMatchObject({ quotesProposed: 2, quotesKept: 1, quotesDuplicate: 1, quotesDropped: 0 });
  });

  it("downgrades an answer with no quotes", async () => {
    const answer = await ask(adhesion, firstSupported.question, { answerNoQuotes: true }).result;
    expectNoClaim(answer, firstSupported.answer);
    expect(answer).toMatchObject({ message: ANSWER_COPY.noVerifiedQuote, related: [] });
    expect(answer.verification).toMatchObject({
      quotesProposed: 0,
      quotesKept: 0,
      downgraded: true,
      downgradeReason: "no-verified-quote",
    });
  });

  it("never passes off an invented claim to an unsupported question as the answer", async () => {
    const answer = await ask(adhesion, firstUnsupported.question, { answerInventedClaim: true }).result;
    expectNoClaim(answer, INVENTED_CLAIM, "health insurance");
    expect(answer.verification).toMatchObject({ quotesProposed: 0, downgraded: true, downgradeReason: "no-verified-quote" });
  });

  it("downgrades an answer that invents a figure its quote doesn't contain, keeping the quote as the closest sentence", async () => {
    const answer = await ask(adhesion, firstSupported.question, { answerInventedFigure: true }).result;
    expectNoClaim(answer, INVENTED_ANSWER_FIGURE.trim(), firstSupported.answer);
    if (answer.kind !== "not-in-document") return;
    expect(answer.message).toBe(ANSWER_COPY.unsupportedDetail);
    expect(answer.related).toHaveLength(1);
    expectCitationsVerbatim(adhesion.text, answer.related);
    expect(overlaps(answer.related[0], supportingSpan)).toBe(true);
    expect(answer.verification).toEqual<AnswerVerification>({
      quotesProposed: 1,
      quotesKept: 1,
      quotesDropped: 0,
      quotesDuplicate: 0,
      downgraded: true,
      downgradeReason: "unsupported-detail",
    });
  });

  it("downgrades an answer that puts a phrase in quotation marks the document doesn't contain", async () => {
    const model = {
      async completeJson() {
        return {
          status: "answered",
          answer: 'Client pays "net 30" on every invoice.',
          quotes: [firstSupported.supportingSentence],
        };
      },
    };
    const answer = await answerQuestion(adhesion.text, firstSupported.question, { model });
    expectNoClaim(answer, "net 30");
    expect(answer.verification.downgradeReason).toBe("unsupported-detail");
  });

  it("rejects output that isn't JSON as invalid output", async () => {
    const { result } = ask(adhesion, firstSupported.question, { answerOutput: "not-json" });
    await expect(result).rejects.toMatchObject({ name: "AnswerError", kind: "invalid-output" });
  });

  it.each([
    ["an unknown status", { status: "probably", answer: "Yes.", quotes: [] }],
    ["no answer field", { status: "answered", quotes: [firstSupported.supportingSentence] }],
    ["no quotes list", { status: "answered", answer: firstSupported.answer }],
    ["a blank answer", { status: "answered", answer: "  ", quotes: [firstSupported.supportingSentence] }],
  ])("rejects output with %s as invalid output", async (_label, output) => {
    const model = { completeJson: async () => output };
    await expect(answerQuestion(adhesion.text, firstSupported.question, { model })).rejects.toMatchObject({
      kind: "invalid-output",
    });
  });

  it("drops quotes that aren't text", async () => {
    const model = {
      completeJson: async () => ({ status: "answered", answer: firstSupported.answer, quotes: [42, firstSupported.supportingSentence] }),
    };
    const answer = await answerQuestion(adhesion.text, firstSupported.question, { model });
    expect(answer.kind).toBe("answered");
    expect(answer.verification).toMatchObject({ quotesProposed: 2, quotesKept: 1, quotesDropped: 1 });
  });

  it("reports a thrown model error as model-failed, keeping the cause", async () => {
    const { result } = ask(adhesion, firstSupported.question, { answerThrows: true });
    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AnswerError);
    expect(error).toMatchObject({ kind: "model-failed" });
    expect(String((error as AnswerError).cause)).toContain("simulated answer failure");
  });
});

/**
 * Outputs the real model returned in the first live smoke run, and after the
 * prompt fix. The live failure was the model itself saying "not-in-document"
 * for a question the quoted sentence answers, which only the live eval can
 * catch. These pin down the rest: the support check was not the cause, and a
 * model-side "not-in-document" is reported as that, never as a downgrade and
 * never with the model's claim.
 */
describe("answerQuestion on recorded live outputs", () => {
  const hourly = adhesion.sidecar.questions.supported[0];
  const invoice = adhesion.sidecar.questions.supported[1];
  const feeSentence = adhesion.text.match(/Client shall deduct a vendor administration fee[^.]*\./)![0];
  const disputeSentence = adhesion.text.match(/If Client disputes any portion of an invoice[^.]*\./)![0];
  const recorded = (output: unknown) => ({ completeJson: async () => output });

  it("answers when figures in digits match number words in the quotes, spread across two quotes", async () => {
    const answer = await answerQuestion(adhesion.text, hourly.question, {
      model: recorded({
        status: "answered",
        answer:
          "Your hourly rate is $110 for Services performed, unless a Statement of Work sets a different rate or a fixed fee. Note that the Client will also deduct a 4% vendor administration fee from each payment, which it can raise by up to 2 percentage points on each anniversary of the Effective Date.",
        quotes: [hourly.supportingSentence, feeSentence],
      }),
    });
    expect(answer.kind).toBe("answered");
    expect(answer.verification).toMatchObject({ quotesKept: 2, downgraded: false, downgradeReason: null });
  });

  it("answers when the answer repeats the document's own \"forty-five (45)\" form", async () => {
    const answer = await answerQuestion(adhesion.text, invoice.question, {
      model: recorded({
        status: "answered",
        answer:
          "Client must pay each undisputed invoice within forty-five (45) days after receiving it. If Client disputes part of an invoice in good faith, Client must notify Consultant of the disputed amount and reason within fifteen (15) days after receiving the invoice and pay the undisputed portion on time.",
        quotes: [invoice.supportingSentence, disputeSentence],
      }),
    });
    expect(answer.kind).toBe("answered");
    if (answer.kind === "answered") expectCitationsVerbatim(adhesion.text, answer.citations);
  });

  it("still downgrades when one of those figures is changed to one no quote contains", async () => {
    const answer = await answerQuestion(adhesion.text, invoice.question, {
      model: recorded({
        status: "answered",
        answer: "Client must pay each undisputed invoice within 60 days after receiving it.",
        quotes: [invoice.supportingSentence, disputeSentence],
      }),
    });
    expect(answer.verification.downgradeReason).toBe("unsupported-detail");
  });

  it("reports the model's own not-in-document as that, not as a downgrade, and drops its claim", async () => {
    const answer = await answerQuestion(adhesion.text, hourly.question, {
      model: recorded({
        status: "not-in-document",
        answer:
          "The document doesn't set your specific hourly rate; it says Client pays an hourly rate of $110 unless a Statement of Work sets a different rate or fixed fee.",
        quotes: [hourly.supportingSentence],
      }),
    });
    expectNoClaim(answer, "doesn't set your specific hourly rate");
    expect(answer).toMatchObject({ message: ANSWER_COPY.notInDocument });
    expect(answer.verification).toMatchObject({ quotesKept: 1, downgraded: false, downgradeReason: null });
  });
});

describe("answerQuestion input", () => {
  it.each([
    ["a blank question", adhesion.text, "   "],
    ["a question over the limit", adhesion.text, `${"a".repeat(QUESTION_MAX_LENGTH)}?`],
    ["blank document text", " \n ", firstSupported.question],
  ])("rejects %s without calling the model", async (_label, text, question) => {
    const model = stubModel();
    await expect(answerQuestion(text, question, { model })).rejects.toMatchObject({ kind: "invalid-input" });
    expect(model.requests).toHaveLength(0);
  });

  it("sends the question trimmed", async () => {
    const { model, result } = ask(adhesion, `  ${firstSupported.question}\n`);
    await result;
    expect(answerRequests(model)[0].user).toContain(`\n${firstSupported.question}\n`);
  });
});

describe("answerQuestion isolation", () => {
  it("sends only the document text and the question: no red lines, no analysis", async () => {
    const outsideStrings: string[] = [];
    const envelopes = new Set<string>();
    const systems = new Set<string>();
    const schemas = new Set<string>();

    for (const name of FIXTURE_NAMES) {
      const fixture = loadFixture(name);
      const model = stubModel();
      // The same model has just analysed this document against red lines.
      const redLines = sidecarRedLines(fixture);
      const analysis = await analyzeDocument(fixture.text, redLines, { model });
      outsideStrings.push(
        ...redLines.map((r) => r.text),
        analysis.summary,
        ...analysis.flags.flatMap((flag) => [
          flag.rationale,
          flag.clauseType,
          ...(flag.counterOffer.status === "drafted" ? [flag.counterOffer.proposedLanguage] : []),
        ]),
        ...analysis.redLineMatches.map((match) => match.explanation),
      );

      const questions = [...fixture.sidecar.questions.supported, ...fixture.sidecar.questions.unsupported];
      for (const { question } of questions) {
        await answerQuestion(fixture.text, question, { model });
        const request = answerRequests(model).at(-1)!;

        expect(Object.keys(request).sort()).toEqual(["name", "schema", "system", "user"]);
        expect(request.user).toContain(fixture.text);
        expect(request.user).toContain(question);

        // With the document and the question taken out, what is left is the
        // same fixed envelope for every document and every question.
        const envelope = request.user.replace(fixture.text, "").replace(question, "");
        envelopes.add(envelope);
        systems.add(request.system);
        schemas.add(JSON.stringify(request.schema));

        for (const part of [envelope, request.system]) {
          expect(part).not.toContain(RED_LINES_START);
          expect(part).not.toContain(COUNTER_OFFER_FLAGS_START);
        }
      }
    }

    expect(envelopes.size).toBe(1);
    expect(systems.size).toBe(1);
    expect(schemas.size).toBe(1);
    const [envelope] = envelopes;
    const [system] = systems;
    const [schema] = schemas;
    for (const outside of outsideStrings) {
      expect(envelope).not.toContain(outside);
      expect(system).not.toContain(outside);
    }
    expect(schema).not.toMatch(/redLine|severity|flag/i);
  });
});

describe("Answer type", () => {
  const verification: AnswerVerification = {
    quotesProposed: 0,
    quotesKept: 0,
    quotesDropped: 0,
    quotesDuplicate: 0,
    downgraded: false,
    downgradeReason: null,
  };

  it("has no way to build an answered answer without a verified citation", () => {
    const citation = locateCitation(adhesion.text, firstSupported.supportingSentence)!;

    // @ts-expect-error an answered answer needs at least one citation
    const none: Answer = { kind: "answered", answer: firstSupported.answer, citations: [], verification };
    // @ts-expect-error a plain object is not a Citation; only locateCitation makes one
    const forged: Answer = { kind: "answered", answer: firstSupported.answer, citations: [{ text: "x", start: 0, end: 1 }], verification };
    // @ts-expect-error a not-in-document answer has no answer text to present
    const claim: Answer = { kind: "not-in-document", answer: INVENTED_CLAIM, message: "", related: [], verification };

    const ok: Answer = { kind: "answered", answer: firstSupported.answer, citations: [citation], verification };
    expect([none, forged, claim, ok]).toHaveLength(4);
  });
});
