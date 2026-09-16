/**
 * End-to-end smoke run: the adhesion fixture through the real analyzeDocument
 * and the real model, with the sidecar's red-line cases as the reader's red
 * lines. `npm run smoke`. Prints the result, each flag's counter-offer under
 * its source sentence, each red-line match with its red line and source
 * sentence, which planted clauses were found and which red-line cases were
 * matched. Never prints the API key.
 */
import { analyzeDocument } from "../lib/analysis/analyze";
import { ModelConfigError, modelClientFromEnv, type ModelClient } from "../lib/model/client";
import { loadFixture } from "../tests/support/fixtures";
import { plantedClausesFound } from "../tests/support/planted";
import { redLineCasesFound, sidecarRedLines } from "../tests/support/red-lines";

const startedAt = Date.now();

async function main(): Promise<number> {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local: rely on the environment.
  }

  let model: ModelClient;
  try {
    model = modelClientFromEnv();
  } catch (error) {
    if (error instanceof ModelConfigError) {
      console.error(`Can't run the smoke test: ${error.missing.join(" and ")} ${error.missing.length > 1 ? "are" : "is"} not set.`);
      console.error("Add them to .env.local or the environment and run it again.");
      return 1;
    }
    throw error;
  }

  const fixture = loadFixture("adhesion-contract");
  console.log(`Analysing tests/fixtures/${fixture.sidecar.document} (${fixture.text.length} characters)...\n`);
  const started = Date.now();
  const redLines = sidecarRedLines(fixture);
  console.log("RED LINES");
  for (const redLine of redLines) console.log(`  ${redLine.id}: ${redLine.text}`);
  console.log("");
  const analysis = await analyzeDocument(fixture.text, redLines, { model });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log("SUMMARY");
  console.log(analysis.summary);
  console.log(`\nFLAGS (${analysis.flags.length})`);
  analysis.flags.forEach((flag, i) => {
    console.log(`\n${i + 1}. ${flag.severity.toUpperCase()} · ${flag.clauseType} · axis: ${flag.axis}`);
    console.log(`   Source [${flag.citation.start}-${flag.citation.end}]: ${flag.citation.text}`);
    console.log(`   Rationale: ${flag.rationale}`);
    if (flag.counterOffer.status === "drafted") {
      console.log(`   Counter-offer: ${flag.counterOffer.proposedLanguage}`);
      if (flag.counterOffer.note) console.log(`   Note: ${flag.counterOffer.note}`);
    } else {
      console.log("   Counter-offer: unavailable");
    }
  });

  console.log(`\nRED-LINE MATCHES (${analysis.redLineMatches.length})`);
  analysis.redLineMatches.forEach((match, i) => {
    console.log(`\n${i + 1}. Red line ${match.redLine.id}: ${match.redLine.text}`);
    console.log(`   Source [${match.citation.start}-${match.citation.end}]: ${match.citation.text}`);
    console.log(`   Explanation: ${match.explanation}`);
  });

  const v = analysis.verification;
  console.log("\nVERIFICATION");
  console.log(`  proposed            ${v.proposed}`);
  console.log(`  kept                ${v.kept}`);
  console.log(`  dropped, no source  ${v.droppedNoSource}`);
  console.log(`  dropped, invalid    ${v.droppedInvalid}`);
  console.log(`  dropped, duplicate  ${v.droppedDuplicate}`);
  console.log(`  rationales replaced ${v.rationalesReplaced}`);
  console.log(`  counter-offers      ${v.counterOffersDrafted} drafted, ${v.counterOffersUnavailable} unavailable`);
  console.log(`  red-line matches    ${v.redLineMatchesProposed} proposed, ${v.redLineMatchesKept} kept`);
  console.log(`    dropped, no source  ${v.redLineMatchesDroppedNoSource}`);
  console.log(`    dropped, invalid    ${v.redLineMatchesDroppedInvalid}`);
  console.log(`    dropped, duplicate  ${v.redLineMatchesDroppedDuplicate}`);
  console.log(`    explanations replaced ${v.redLineExplanationsReplaced}`);

  const results = plantedClausesFound(fixture, analysis.flags);
  const found = results.filter((r) => r.flags.length > 0).length;
  console.log(`\nPLANTED CLAUSES FOUND (${found}/${results.length})`);
  for (const { clause, flags } of results) {
    const tiers = flags.map((flag) => flag.severity).join(", ");
    const mark = flags.length > 0 ? "found " : "MISSED";
    console.log(`  ${mark} ${clause.id} (expected ${clause.expectedSeverity}${flags.length ? `, flagged ${tiers}` : ""})`);
  }

  const cases = redLineCasesFound(fixture, redLines, analysis.redLineMatches);
  const matched = cases.filter((r) => r.matches.length > 0).length;
  console.log(`\nRED-LINE CASES FOUND (${matched}/${cases.length})`);
  for (const { redLineCase, redLine, matches } of cases) {
    const mark = matches.length > 0 ? "found " : "MISSED";
    const bar = redLineCase.clearsDangerousBar ? "clears the dangerous bar" : "below the dangerous bar";
    console.log(`  ${mark} ${redLine.id} "${redLine.text}" (${bar})`);
  }
  console.log(`\nDone in ${seconds}s.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const kind = error && typeof error === "object" && "kind" in error ? ` (${String(error.kind)})` : "";
    const cause = error instanceof Error && error.cause instanceof Error ? `\n  cause: ${error.cause.name}: ${error.cause.message}` : "";
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.error(`Smoke run failed after ${seconds}s${kind}: ${error instanceof Error ? error.message : String(error)}${cause}`);
    process.exit(1);
  },
);
