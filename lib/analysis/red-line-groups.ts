import type { Flag, RedLineMatch } from "./types";

/**
 * Where each red-line match is shown on the result screen. A match whose
 * citation overlaps a flag's citation is shown on that flag, as an overprint
 * that leaves the flag's tier alone. A match that overlaps no flag is shown in
 * its own group with its full citation. Only indexes are returned: neither
 * list is changed or merged into the other (ADR 0007).
 */
export interface RedLineGroups {
  /** For each flag, by index, the indexes of the matches shown on it. */
  onFlag: number[][];
  /** Indexes of matches that overlap no flag, in document order. */
  onTheirOwn: number[];
}

export function overlaps(a: Flag["citation"], b: Flag["citation"]): boolean {
  return a.start < b.end && b.start < a.end;
}

export function groupRedLineMatches(flags: readonly Flag[], matches: readonly RedLineMatch[]): RedLineGroups {
  const onFlag = flags.map(() => [] as number[]);
  const onTheirOwn: number[] = [];
  matches.forEach((match, m) => {
    let shown = false;
    flags.forEach((flag, f) => {
      if (!overlaps(flag.citation, match.citation)) return;
      onFlag[f].push(m);
      shown = true;
    });
    if (!shown) onTheirOwn.push(m);
  });
  return { onFlag, onTheirOwn };
}
