import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  RED_LINES_MAX_COUNT,
  RED_LINE_COPY,
  RED_LINE_MAX_LENGTH,
  loadRedLinesForAnalysis,
  runAddRedLine,
  runRemoveRedLine,
  runUpdateRedLine,
  validateRedLineId,
  validateRedLineText,
} from "@/lib/red-lines/red-lines";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { fakeRedLineStore, redLineRow } from "../support/fake-red-line-store";

const ID = "3f1c2b8e-9a4d-4c6e-8f0a-1b2c3d4e5f60";

describe("validateRedLineText", () => {
  it.each([
    ["no payload", undefined, RED_LINE_COPY.missingText],
    ["a string payload", "Net 60", RED_LINE_COPY.missingText],
    ["blank text", { text: " \n\t " }, RED_LINE_COPY.missingText],
    ["text that isn't a string", { text: 42 }, RED_LINE_COPY.missingText],
    ["text over the limit", { text: "x".repeat(RED_LINE_MAX_LENGTH + 1) }, RED_LINE_COPY.longText],
  ])("rejects %s", (_label, input, message) => {
    expect(validateRedLineText(input)).toEqual({ ok: false, message });
  });

  it("trims, joins lines, and accepts text right at the limit", () => {
    expect(validateRedLineText({ text: "  Payment later than\n30 days  " })).toEqual({ ok: true, text: "Payment later than 30 days" });
    const atLimit = "x".repeat(RED_LINE_MAX_LENGTH);
    expect(validateRedLineText({ text: atLimit })).toEqual({ ok: true, text: atLimit });
  });

  it("counts the limit after whitespace is collapsed", () => {
    const padded = `${"x".repeat(RED_LINE_MAX_LENGTH)}      `;
    expect(validateRedLineText({ text: padded }).ok).toBe(true);
  });
});

describe("validateRedLineId", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(validateRedLineId({ id: ID })).toEqual({ ok: true, id: ID });
    for (const id of [undefined, "", "rl-1", "1; delete from red_lines", 7]) {
      expect(validateRedLineId({ id })).toEqual({ ok: false, message: RED_LINE_COPY.missingId });
    }
  });
});

describe("runAddRedLine", () => {
  it("reports accounts as unavailable when Supabase isn't configured", async () => {
    expect(await runAddRedLine({ text: "Net 60" }, null)).toEqual({ status: "unavailable", message: RED_LINE_COPY.unavailable });
  });

  it("refuses a signed-out visitor without writing", async () => {
    const store = fakeRedLineStore({ userId: null });
    expect(await runAddRedLine({ text: "Net 60" }, store)).toEqual({ status: "signed-out", message: RED_LINE_COPY.signedOut });
    expect(store.writes).toEqual([]);
  });

  it("adds the cleaned-up text and nothing else from the payload", async () => {
    const store = fakeRedLineStore();
    const state = await runAddRedLine({ text: "  Net 60 \n or longer ", user_id: "user-b", id: ID }, store);
    expect(state).toMatchObject({ status: "saved", redLine: { text: "Net 60 or longer" } });
    expect(store.writes).toEqual([{ op: "insert", args: ["Net 60 or longer"] }]);
  });

  it("validates before writing", async () => {
    const store = fakeRedLineStore();
    expect(await runAddRedLine({ text: "" }, store)).toEqual({ status: "invalid", message: RED_LINE_COPY.missingText });
    expect(store.writes).toEqual([]);
  });

  it("refuses a red line already on the list, ignoring case", async () => {
    const store = fakeRedLineStore({ rows: [redLineRow("Net 60")] });
    expect(await runAddRedLine({ text: "net 60" }, store)).toEqual({ status: "invalid", message: RED_LINE_COPY.duplicate });
    expect(store.writes).toEqual([]);
  });

  it(`refuses a ${RED_LINES_MAX_COUNT + 1}th red line`, async () => {
    const rows = Array.from({ length: RED_LINES_MAX_COUNT }, (_, i) => redLineRow(`Red line ${i + 1}`));
    const store = fakeRedLineStore({ rows });
    expect(await runAddRedLine({ text: "One more" }, store)).toEqual({ status: "invalid", message: RED_LINE_COPY.full });
    expect(store.writes).toEqual([]);

    const room = fakeRedLineStore({ rows: rows.slice(1) });
    expect((await runAddRedLine({ text: "One more" }, room)).status).toBe("saved");
  });

  it("reports a failed read or insert without claiming it saved", async () => {
    expect(await runAddRedLine({ text: "Net 60" }, fakeRedLineStore({ listFails: true }))).toEqual({
      status: "error",
      message: RED_LINE_COPY.addFailed,
    });
    expect(await runAddRedLine({ text: "Net 60" }, fakeRedLineStore({ writeFails: true }))).toEqual({
      status: "error",
      message: RED_LINE_COPY.addFailed,
    });
  });
});

describe("runUpdateRedLine", () => {
  it("replaces the text of the named red line", async () => {
    const store = fakeRedLineStore({ rows: [redLineRow("Net 60", ID)] });
    const state = await runUpdateRedLine({ id: ID, text: " Net 45 " }, store);
    expect(state).toMatchObject({ status: "saved", redLine: { id: ID, text: "Net 45" } });
    expect(store.rows.map((r) => r.text)).toEqual(["Net 45"]);
  });

  it("allows saving a red line with its own text, but not another's", async () => {
    const other = redLineRow("Any non-compete");
    const store = fakeRedLineStore({ rows: [redLineRow("Net 60", ID), other] });
    expect((await runUpdateRedLine({ id: ID, text: "NET 60" }, store)).status).toBe("saved");
    expect(await runUpdateRedLine({ id: ID, text: "any non-compete" }, store)).toEqual({
      status: "invalid",
      message: RED_LINE_COPY.duplicate,
    });
  });

  it("validates the id and the text before writing", async () => {
    const store = fakeRedLineStore({ rows: [redLineRow("Net 60", ID)] });
    expect(await runUpdateRedLine({ id: "rl-1", text: "Net 45" }, store)).toEqual({
      status: "invalid",
      message: RED_LINE_COPY.missingId,
    });
    expect(await runUpdateRedLine({ id: ID, text: "  " }, store)).toEqual({ status: "invalid", message: RED_LINE_COPY.missingText });
    expect(store.writes).toEqual([]);
  });

  it("reports a red line that isn't there (or isn't yours) as an error", async () => {
    const store = fakeRedLineStore({ rows: [] });
    expect(await runUpdateRedLine({ id: ID, text: "Net 45" }, store)).toEqual({
      status: "error",
      message: RED_LINE_COPY.updateFailed,
    });
  });

  it("checks the session first", async () => {
    expect((await runUpdateRedLine({ id: ID, text: "x" }, null)).status).toBe("unavailable");
    expect((await runUpdateRedLine({ id: ID, text: "x" }, fakeRedLineStore({ userId: null }))).status).toBe("signed-out");
  });
});

describe("runRemoveRedLine", () => {
  it("removes the named red line", async () => {
    const keep = redLineRow("Any non-compete");
    const store = fakeRedLineStore({ rows: [redLineRow("Net 60", ID), keep] });
    expect(await runRemoveRedLine({ id: ID }, store)).toEqual({ status: "removed", id: ID });
    expect(store.rows).toEqual([keep]);
  });

  it("validates the id, and reports a failed or missing delete", async () => {
    const store = fakeRedLineStore({ rows: [] });
    expect(await runRemoveRedLine({ id: "" }, store)).toEqual({ status: "invalid", message: RED_LINE_COPY.missingId });
    expect(await runRemoveRedLine({ id: ID }, store)).toEqual({ status: "error", message: RED_LINE_COPY.removeFailed });
  });

  it("checks the session first", async () => {
    expect((await runRemoveRedLine({ id: ID }, null)).status).toBe("unavailable");
    const store = fakeRedLineStore({ userId: null, rows: [redLineRow("Net 60", ID)] });
    expect((await runRemoveRedLine({ id: ID }, store)).status).toBe("signed-out");
    expect(store.rows).toHaveLength(1);
  });
});

describe("loadRedLinesForAnalysis", () => {
  it("returns the user's red lines as id and text only", async () => {
    const row = redLineRow("Net 60", ID);
    expect(await loadRedLinesForAnalysis(fakeRedLineStore({ rows: [row] }))).toEqual({
      status: "loaded",
      redLines: [{ id: ID, text: "Net 60" }],
    });
  });

  it("returns none, with the reason, when there is no store, no session or no read", async () => {
    const rows = [redLineRow("Net 60")];
    expect(await loadRedLinesForAnalysis(null)).toEqual({ status: "unavailable", redLines: [] });
    expect(await loadRedLinesForAnalysis(fakeRedLineStore({ userId: null, rows }))).toEqual({ status: "signed-out", redLines: [] });
    expect(await loadRedLinesForAnalysis(fakeRedLineStore({ listFails: true, rows }))).toEqual({ status: "failed", redLines: [] });
  });
});

describe("supabaseRedLineStore", () => {
  /** Records the calls made on a Supabase client and answers with a configured result. */
  function recordingClient(result: { data: unknown; error: unknown }) {
    const calls: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of ["insert", "update", "delete", "select", "eq"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return Object.assign(Promise.resolve(result), builder);
      };
    }
    builder.order = (...args: unknown[]) => {
      calls.push(["order", ...args]);
      return Promise.resolve(result);
    };
    builder.single = () => Promise.resolve(result);
    builder.maybeSingle = () => Promise.resolve(result);
    const client = {
      auth: { getClaims: async () => ({ data: { claims: { sub: "user-a" } }, error: null }) },
      from(table: string) {
        calls.push(["from", table]);
        return builder;
      },
    };
    return { calls, client: client as unknown as SupabaseClient };
  }

  const row = { id: ID, text: "Net 60", created_at: "2026-09-16T12:00:00Z" };

  it("inserts only the text", async () => {
    const { calls, client } = recordingClient({ data: row, error: null });
    expect(await supabaseRedLineStore(client).insert("Net 60")).toEqual({ id: ID, text: "Net 60", createdAt: row.created_at });
    expect(calls.slice(0, 2)).toEqual([
      ["from", "red_lines"],
      ["insert", { text: "Net 60" }],
    ]);
  });

  it("updates only the text of one id, and returns null when no row came back", async () => {
    const { calls, client } = recordingClient({ data: null, error: null });
    expect(await supabaseRedLineStore(client).update(ID, "Net 45")).toBeNull();
    expect(calls).toContainEqual(["update", { text: "Net 45" }]);
    expect(calls).toContainEqual(["eq", "id", ID]);
  });

  it("reports a delete that removed nothing as false", async () => {
    expect(await supabaseRedLineStore(recordingClient({ data: [], error: null }).client).remove(ID)).toBe(false);
    expect(await supabaseRedLineStore(recordingClient({ data: [{ id: ID }], error: null }).client).remove(ID)).toBe(true);
    expect(await supabaseRedLineStore(recordingClient({ data: null, error: { message: "denied" } }).client).remove(ID)).toBe(false);
  });

  it("lists the user's red lines oldest first", async () => {
    const { calls, client } = recordingClient({ data: [row], error: null });
    expect(await supabaseRedLineStore(client).listForUser("user-a")).toEqual([{ id: ID, text: "Net 60", createdAt: row.created_at }]);
    expect(calls).toContainEqual(["eq", "user_id", "user-a"]);
    expect(calls).toContainEqual(["order", "created_at", { ascending: true }]);
  });
});
