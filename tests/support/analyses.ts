import { randomUUID } from "node:crypto";
import { analyzeDocument } from "@/lib/analysis/analyze";
import type { Analysis, RedLineRef } from "@/lib/analysis/types";
import type { StoredDocument } from "@/lib/documents/documents";
import { loadFixture, type Fixture, type FixtureName } from "./fixtures";
import { sidecarRedLines } from "./red-lines";
import { stubModel } from "./stub-model";

export interface AnalyzedFixture {
  fixture: Fixture;
  redLines: RedLineRef[];
  analysis: Analysis;
}

/** A real analysis of a fixture: the full pipeline, with the stub model and the sidecar's red lines. */
export async function analyzeFixture(name: FixtureName): Promise<AnalyzedFixture> {
  const fixture = loadFixture(name);
  const redLines = sidecarRedLines(fixture);
  const analysis = await analyzeDocument(fixture.text, redLines, { model: stubModel(), log: () => {} });
  return { fixture, redLines, analysis };
}

/** A fixture as a kept document. */
export function keptDocument(fixture: Fixture, overrides: Partial<StoredDocument> = {}): StoredDocument {
  return {
    id: randomUUID(),
    title: fixture.name,
    text: fixture.text,
    createdAt: "2026-09-10T09:00:00Z",
    ...overrides,
  };
}

/** A deep, plain JSON copy, the way a jsonb column hands data back. */
export function jsonCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
