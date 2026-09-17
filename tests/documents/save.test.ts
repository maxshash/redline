import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_COPY,
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  runSaveDocument,
  titleFromFileName,
  titleFromText,
  validateNewDocument,
} from "@/lib/documents/documents";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { prepareAnalysisRecord } from "@/lib/analysis/stored";
import { analyzeFixture } from "../support/analyses";
import { fakeDocumentStore } from "../support/fake-document-store";
import { loadFixture } from "../support/fixtures";

const { text } = loadFixture("adhesion-contract");

describe("runSaveDocument", () => {
  it("reports accounts as unavailable when Supabase isn't configured", async () => {
    expect(await runSaveDocument({ title: "Lease", text }, null)).toEqual({ status: "unavailable" });
  });

  it("refuses to save for a signed-out visitor, without inserting", async () => {
    const store = fakeDocumentStore({ userId: null });
    expect(await runSaveDocument({ title: "Lease", text }, store)).toEqual({ status: "signed-out" });
    expect(store.inserts).toEqual([]);
  });

  it("saves the title and the text exactly as extracted", async () => {
    const store = fakeDocumentStore();
    const state = await runSaveDocument({ title: "  Brackenfold agreement  ", text }, store);
    expect(state).toEqual({
      status: "saved",
      document: { id: "doc-1", title: "Brackenfold agreement", createdAt: "2026-09-16T12:00:00Z" },
    });
    expect(store.inserts).toEqual([{ title: "Brackenfold agreement", text }]);
  });

  it("persists only title and text, whatever else the caller sends", async () => {
    const store = fakeDocumentStore();
    const hostile = {
      title: "Lease",
      text: "Rent is due monthly.",
      user_id: "user-b",
      id: "00000000-0000-0000-0000-000000000000",
      created_at: "1999-01-01",
      file: new Uint8Array([37, 80, 68, 70]),
    };
    await runSaveDocument(hostile, store);
    expect(store.inserts).toHaveLength(1);
    expect(Object.keys(store.inserts[0] as object).sort()).toEqual(["text", "title"]);
  });

  it("reports a failed insert without claiming it saved", async () => {
    const store = fakeDocumentStore({ insertFails: true });
    expect(await runSaveDocument({ title: "Lease", text }, store)).toEqual({
      status: "error",
      message: DOCUMENT_COPY.saveFailed,
    });
  });

  it("validates before inserting", async () => {
    const store = fakeDocumentStore();
    expect(await runSaveDocument({ title: "", text }, store)).toEqual({
      status: "invalid",
      message: DOCUMENT_COPY.missingTitle,
    });
    expect(store.inserts).toEqual([]);
  });
});

describe("validateNewDocument", () => {
  it.each([
    ["no payload", undefined, DOCUMENT_COPY.missingTitle],
    ["a string payload", "Lease", DOCUMENT_COPY.missingTitle],
    ["a blank title", { title: "   ", text }, DOCUMENT_COPY.missingTitle],
    ["a non-string title", { title: 42, text }, DOCUMENT_COPY.missingTitle],
    ["a title that is too long", { title: "x".repeat(TITLE_MAX_LENGTH + 1), text }, DOCUMENT_COPY.longTitle],
    ["missing text", { title: "Lease" }, DOCUMENT_COPY.missingText],
    ["whitespace-only text", { title: "Lease", text: " \n\n " }, DOCUMENT_COPY.missingText],
    ["text sent as bytes", { title: "Lease", text: new Uint8Array([1, 2]) }, DOCUMENT_COPY.missingText],
    ["text over the limit", { title: "Lease", text: "a".repeat(TEXT_MAX_LENGTH + 1) }, DOCUMENT_COPY.longText],
  ])("rejects %s", (_label, input, message) => {
    expect(validateNewDocument(input)).toEqual({ ok: false, message });
  });

  it("accepts values right at the limits", () => {
    const title = "t".repeat(TITLE_MAX_LENGTH);
    const long = "a".repeat(TEXT_MAX_LENGTH);
    expect(validateNewDocument({ title, text: long })).toEqual({ ok: true, document: { title, text: long } });
  });

  it("does not trim or otherwise alter the text", () => {
    const raw = "\n  Clause 1.  \n";
    expect(validateNewDocument({ title: "T", text: raw })).toEqual({ ok: true, document: { title: "T", text: raw } });
  });
});

describe("supabaseDocumentStore", () => {
  /** Records the calls made on a Supabase client and answers with fixed rows. */
  function recordingClient(options: { sub?: string | null; insertError?: boolean } = {}) {
    const calls: Array<[string, ...unknown[]]> = [];
    const row = { id: "doc-1", title: "Lease", created_at: "2026-09-16T12:00:00Z" };
    const builder = {
      insert(payload: unknown) {
        calls.push(["insert", payload]);
        return builder;
      },
      select(columns: string) {
        calls.push(["select", columns]);
        return builder;
      },
      eq(column: string, value: unknown) {
        calls.push(["eq", column, value]);
        return builder;
      },
      order(column: string, opts: unknown) {
        calls.push(["order", column, opts]);
        return Promise.resolve({ data: [row], error: null });
      },
      single() {
        return Promise.resolve(options.insertError ? { data: null, error: { message: "denied" } } : { data: row, error: null });
      },
    };
    const client = {
      auth: {
        async getClaims() {
          return options.sub ? { data: { claims: { sub: options.sub } }, error: null } : { data: null, error: null };
        },
      },
      from(table: string) {
        calls.push(["from", table]);
        return builder;
      },
    };
    return { calls, client: client as unknown as SupabaseClient };
  }

  it("inserts only title and text into documents, never a user id", async () => {
    const { calls, client } = recordingClient({ sub: "user-a" });
    const store = supabaseDocumentStore(client);
    const sneaky = { title: "Lease", text: "Rent is due.", user_id: "user-b" };
    expect(await store.insert(sneaky)).toEqual({ id: "doc-1", title: "Lease", createdAt: "2026-09-16T12:00:00Z" });
    expect(calls.slice(0, 2)).toEqual([
      ["from", "documents"],
      ["insert", { title: "Lease", text: "Rent is due." }],
    ]);
  });

  it("inserts an analysis with only its document id and JSON, never a user id", async () => {
    const { calls, client } = recordingClient({ sub: "user-a" });
    const { fixture, analysis, redLines } = await analyzeFixture("adhesion-contract");
    const prepared = prepareAnalysisRecord(fixture.text, analysis, redLines);
    if (!prepared.ok) throw new Error("fixture analysis should verify");
    expect(await supabaseDocumentStore(client).insertAnalysis("doc-1", prepared.record)).toEqual({
      id: "doc-1",
      createdAt: "2026-09-16T12:00:00Z",
    });
    expect(calls.slice(0, 2)).toEqual([
      ["from", "analyses"],
      ["insert", { document_id: "doc-1", result: prepared.record.result, red_lines_used: prepared.record.redLinesUsed }],
    ]);
  });

  it("returns null when Supabase refuses the insert", async () => {
    const { client } = recordingClient({ sub: "user-a", insertError: true });
    expect(await supabaseDocumentStore(client).insert({ title: "Lease", text: "Rent." })).toBeNull();
  });

  it("reads the user from verified claims", async () => {
    expect(await supabaseDocumentStore(recordingClient({ sub: "user-a" }).client).currentUserId()).toBe("user-a");
    expect(await supabaseDocumentStore(recordingClient({ sub: null }).client).currentUserId()).toBeNull();
  });

  it("lists the user's documents newest first", async () => {
    const { calls, client } = recordingClient({ sub: "user-a" });
    expect(await supabaseDocumentStore(client).listForUser("user-a")).toEqual([
      { id: "doc-1", title: "Lease", createdAt: "2026-09-16T12:00:00Z" },
    ]);
    expect(calls).toContainEqual(["eq", "user_id", "user-a"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: false }]);
  });
});

describe("titles", () => {
  it("uses the file name without its extension", () => {
    expect(titleFromFileName("Brackenfold MSA v3.final.pdf")).toBe("Brackenfold MSA v3.final");
    expect(titleFromFileName(".docx")).toBe(".docx");
  });

  it("uses the first line of pasted text, shortened at a word", () => {
    expect(titleFromText("\n\nMASTER CONSULTING SERVICES AGREEMENT\n\nThis Agreement...")).toBe(
      "MASTER CONSULTING SERVICES AGREEMENT",
    );
    const long = titleFromText(`${"word ".repeat(40)}end`);
    expect(long.length).toBeLessThanOrEqual(81);
    expect(long.endsWith("word…")).toBe(true);
    expect(titleFromText("   ")).toBe("Pasted document");
  });
});
