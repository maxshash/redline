import type { Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareAnalysisRecord } from "@/lib/analysis/stored";
import { analyzeFixture } from "../support/analyses";
import { createSupabaseTestDb, type SupabaseTestDb } from "../support/supabase-db";

/**
 * Row-level security on public.analyses, run against the real migration SQL.
 * Every query goes through the `authenticated` or `anon` role, the way
 * Supabase's API runs a request, so the policies (not the app) decide.
 */

let t: SupabaseTestDb;
let alice: string;
let bob: string;
let aliceDocId: string;
let bobDocId: string;
let aliceAnalysisId: string;
let result: string;
let redLinesUsed: string;

const insertDoc = (tx: Transaction, title: string, text: string) =>
  tx
    .query<{ id: string }>("insert into public.documents (title, text) values ($1, $2) returning id", [title, text])
    .then((r) => r.rows[0].id);

beforeAll(async () => {
  t = await createSupabaseTestDb();
  alice = await t.createUser("alice@example.test");
  bob = await t.createUser("bob@example.test");

  const { fixture, analysis, redLines } = await analyzeFixture("adhesion-contract");
  const prepared = prepareAnalysisRecord(fixture.text, analysis, redLines);
  if (!prepared.ok) throw new Error("fixture analysis should verify");
  result = JSON.stringify(prepared.record.result);
  redLinesUsed = JSON.stringify(prepared.record.redLinesUsed);

  aliceDocId = await t.asUser(alice, (tx) => insertDoc(tx, "Brackenfold consulting agreement", fixture.text));
  bobDocId = await t.asUser(bob, (tx) => insertDoc(tx, "Bob's lease", "Rent is due monthly."));
}, 60_000);

afterAll(async () => {
  await t?.close();
});

describe("analyses: the owner", () => {
  it("can store an analysis of their own document without naming a user; it is theirs", async () => {
    const row = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string; user_id: string; document_id: string }>(
        "insert into public.analyses (document_id, result, red_lines_used) values ($1, $2, $3) returning id, user_id, document_id",
        [aliceDocId, result, redLinesUsed],
      );
      return rows[0];
    });
    expect(row).toMatchObject({ user_id: alice, document_id: aliceDocId });
    aliceAnalysisId = row.id;
  });

  it("can read it back with the JSON intact, latest first", async () => {
    const later = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into public.analyses (document_id, result, red_lines_used, created_at) values ($1, $2, $3, now() + interval '1 minute') returning id",
        [aliceDocId, result, redLinesUsed],
      );
      return rows[0].id;
    });
    const rows = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string; result: unknown; red_lines_used: unknown }>(
        "select id, result, red_lines_used from public.analyses where document_id = $1 order by created_at desc",
        [aliceDocId],
      );
      return rows;
    });
    expect(rows.map((r) => r.id)).toEqual([later, aliceAnalysisId]);
    expect(rows[1].result).toEqual(JSON.parse(result));
    expect(rows[1].red_lines_used).toEqual(JSON.parse(redLinesUsed));
  });
});

describe("analyses: another signed-in user", () => {
  it("cannot read the owner's analyses, by id, by document or in a list", async () => {
    const rows = await t.asUser(bob, async (tx) => ({
      byId: (await tx.query("select * from public.analyses where id = $1", [aliceAnalysisId])).rows,
      byDocument: (await tx.query("select * from public.analyses where document_id = $1", [aliceDocId])).rows,
      all: (await tx.query("select * from public.analyses")).rows,
    }));
    expect(rows).toEqual({ byId: [], byDocument: [], all: [] });
  });

  it("cannot attach an analysis to the owner's document, even as themselves", async () => {
    await expect(
      t.asUser(bob, (tx) =>
        tx.query("insert into public.analyses (document_id, result, red_lines_used) values ($1, $2, $3)", [
          aliceDocId,
          result,
          redLinesUsed,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.asUser(bob, (tx) =>
        tx.query("insert into public.analyses (document_id, user_id, result, red_lines_used) values ($1, $2, $3, $4)", [
          aliceDocId,
          bob,
          result,
          redLinesUsed,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot insert an analysis as the owner, on either document", async () => {
    for (const documentId of [aliceDocId, bobDocId]) {
      await expect(
        t.asUser(bob, (tx) =>
          tx.query("insert into public.analyses (document_id, user_id, result, red_lines_used) values ($1, $2, $3, $4)", [
            documentId,
            alice,
            result,
            redLinesUsed,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it("cannot update or delete the owner's analyses", async () => {
    const affected = await t.asUser(bob, async (tx) => [
      (await tx.query("update public.analyses set result = '{}'::jsonb where id = $1", [aliceAnalysisId])).affectedRows,
      (await tx.query("update public.analyses set user_id = $1 where id = $2", [bob, aliceAnalysisId])).affectedRows,
      (await tx.query("delete from public.analyses where id = $1", [aliceAnalysisId])).affectedRows,
    ]);
    expect(affected).toEqual([0, 0, 0]);
  });

  it("cannot move their own analysis onto the owner's document", async () => {
    const bobAnalysisId = await t.asUser(bob, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into public.analyses (document_id, result, red_lines_used) values ($1, '{}'::jsonb, '[]'::jsonb) returning id",
        [bobDocId],
      );
      return rows[0].id;
    });
    await expect(
      t.asUser(bob, (tx) => tx.query("update public.analyses set document_id = $1 where id = $2", [aliceDocId, bobAnalysisId])),
    ).rejects.toThrow(/row-level security/);
  });

  it("left the owner's analyses exactly as they were", async () => {
    const rows = await t.asUser(alice, async (tx) => {
      return (
        await tx.query<{ result: unknown; user_id: string }>("select result, user_id from public.analyses where id = $1", [
          aliceAnalysisId,
        ])
      ).rows;
    });
    expect(rows).toEqual([{ result: JSON.parse(result), user_id: alice }]);
  });
});

describe("analyses: signed out", () => {
  it("anon can't read or insert any analysis", async () => {
    await expect(t.asAnon((tx) => tx.query("select * from public.analyses"))).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon((tx) =>
        tx.query("insert into public.analyses (document_id, user_id, result, red_lines_used) values ($1, $2, '{}', '[]')", [
          aliceDocId,
          alice,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("analyses: the table", () => {
  it("rejects result and red_lines_used of the wrong JSON type", async () => {
    await expect(
      t.asUser(alice, (tx) =>
        tx.query("insert into public.analyses (document_id, result, red_lines_used) values ($1, '[]', '[]')", [aliceDocId]),
      ),
    ).rejects.toThrow(/analyses_result_is_object/);
    await expect(
      t.asUser(alice, (tx) =>
        tx.query("insert into public.analyses (document_id, result, red_lines_used) values ($1, '{}', '{}')", [aliceDocId]),
      ),
    ).rejects.toThrow(/analyses_red_lines_used_is_array/);
  });

  it("deletes a document's analyses when the document is deleted", async () => {
    const before = await t.asUser(alice, async (tx) =>
      (await tx.query<{ n: number }>("select count(*)::int as n from public.analyses where document_id = $1", [aliceDocId])).rows[0].n,
    );
    expect(before).toBeGreaterThan(0);
    await t.asUser(alice, (tx) => tx.query("delete from public.documents where id = $1", [aliceDocId]));
    const { rows } = await t.db.query("select id from public.analyses where document_id = $1", [aliceDocId]);
    expect(rows).toEqual([]);
  });
});
