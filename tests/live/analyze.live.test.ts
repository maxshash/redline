import { describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analysis/analyze";
import { modelClientFromEnv } from "@/lib/model/client";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture } from "../support/fixtures";
import { plantedClausesFound } from "../support/planted";

/**
 * The live eval: the real model through OpenRouter, on both fixtures, against
 * PRD.md's "What good looks like" bars. Run with `npm run eval`. Costs money.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
if (!hasKey) {
  console.warn("Live eval skipped: OPENROUTER_API_KEY is not set. Add it to .env.local or the environment to run it.");
}

describe.skipIf(!hasKey)("analyzeDocument against the real model", () => {
  it("adhesion contract: every citation verbatim, and at least 80% of planted critical and serious clauses flagged", async () => {
    const fixture = loadFixture("adhesion-contract");
    const analysis = await analyzeDocument(fixture.text, { model: modelClientFromEnv() });
    console.info("adhesion-contract verification", analysis.verification);

    expectCitationsVerbatim(
      fixture.text,
      analysis.flags.map((flag) => flag.citation),
    );
    expect(analysis.summary.length).toBeGreaterThan(0);

    const heavy = plantedClausesFound(fixture, analysis.flags).filter(
      (result) => result.clause.expectedSeverity !== "worth-noting",
    );
    const found = heavy.filter((result) => result.flags.length > 0);
    const missed = heavy.filter((result) => result.flags.length === 0).map((result) => result.clause.id);
    console.info(`recall ${found.length}/${heavy.length}; missed: ${missed.join(", ") || "none"}`);
    expect(found.length / heavy.length).toBeGreaterThanOrEqual(0.8);
  });

  it("clean agreement: every citation verbatim, and no critical or serious flags", async () => {
    const fixture = loadFixture("clean-agreement");
    const analysis = await analyzeDocument(fixture.text, { model: modelClientFromEnv() });
    console.info("clean-agreement verification", analysis.verification);

    expectCitationsVerbatim(
      fixture.text,
      analysis.flags.map((flag) => flag.citation),
    );
    expect(analysis.summary.length).toBeGreaterThan(0);
    const heavy = analysis.flags.filter((flag) => flag.severity !== "worth-noting");
    expect(
      heavy.map((flag) => `${flag.severity}: ${flag.citation.text}`),
    ).toEqual([]);
  });
});
