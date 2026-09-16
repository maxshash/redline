/**
 * End-to-end smoke run: the adhesion fixture through the real analyzeDocument
 * and the real model. `npm run smoke`. Prints the result and which planted
 * clauses were found. Never prints the API key.
 */
import { analyzeDocument } from "../lib/analysis/analyze";
import { ModelConfigError, modelClientFromEnv, type ModelClient } from "../lib/model/client";
import { loadFixture } from "../tests/support/fixtures";
import { plantedClausesFound } from "../tests/support/planted";

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
  const analysis = await analyzeDocument(fixture.text, { model });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log("SUMMARY");
  console.log(analysis.summary);
  console.log(`\nFLAGS (${analysis.flags.length})`);
  analysis.flags.forEach((flag, i) => {
    console.log(`\n${i + 1}. ${flag.severity.toUpperCase()} · ${flag.clauseType} · axis: ${flag.axis}`);
    console.log(`   Source [${flag.citation.start}-${flag.citation.end}]: ${flag.citation.text}`);
    console.log(`   Rationale: ${flag.rationale}`);
  });

  const v = analysis.verification;
  console.log("\nVERIFICATION");
  console.log(`  proposed            ${v.proposed}`);
  console.log(`  kept                ${v.kept}`);
  console.log(`  dropped, no source  ${v.droppedNoSource}`);
  console.log(`  dropped, invalid    ${v.droppedInvalid}`);
  console.log(`  dropped, duplicate  ${v.droppedDuplicate}`);
  console.log(`  rationales replaced ${v.rationalesReplaced}`);

  const results = plantedClausesFound(fixture, analysis.flags);
  const found = results.filter((r) => r.flags.length > 0).length;
  console.log(`\nPLANTED CLAUSES FOUND (${found}/${results.length})`);
  for (const { clause, flags } of results) {
    const tiers = flags.map((flag) => flag.severity).join(", ");
    const mark = flags.length > 0 ? "found " : "MISSED";
    console.log(`  ${mark} ${clause.id} (expected ${clause.expectedSeverity}${flags.length ? `, flagged ${tiers}` : ""})`);
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
