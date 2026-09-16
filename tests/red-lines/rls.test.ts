import type { Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RED_LINES_MAX_COUNT, RED_LINE_MAX_LENGTH } from "@/lib/red-lines/red-lines";
import { createSupabaseTestDb, type SupabaseTestDb } from "../support/supabase-db";

/**
 * Row-level security on public.red_lines, run against the real migration SQL.
 * Every query goes through the `authenticated` or `anon` role, the way
 * Supabase's API runs a request, so the policies (not the app) decide.
 */

let t: SupabaseTestDb;
let alice: string;
let bob: string;
let aliceLineId: string;

const count = (tx: Transaction) =>
  tx.query<{ n: number }>("select count(*)::int as n from public.red_lines").then((r) => r.rows[0].n);

beforeAll(async () => {
  t = await createSupabaseTestDb();
  alice = await t.createUser("alice@example.test");
  bob = await t.createUser("bob@example.test");
}, 60_000);

afterAll(async () => {
  await t?.close();
});

describe("red lines: the owner", () => {
  it("can add a red line without naming a user; it is theirs", async () => {
    const row = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string; user_id: string; text: string }>(
        "insert into public.red_lines (text) values ($1) returning id, user_id, text",
        ["Anything that stops me working with other clients"],
      );
      return rows[0];
    });
    expect(row).toMatchObject({ user_id: alice, text: "Anything that stops me working with other clients" });
    aliceLineId = row.id;
  });

  it("can read it back", async () => {
    const rows = await t.asUser(alice, async (tx) => (await tx.query("select id, text from public.red_lines")).rows);
    expect(rows).toEqual([{ id: aliceLineId, text: "Anything that stops me working with other clients" }]);
  });

  it("can edit it, and updated_at moves", async () => {
    const before = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ updated_at: Date }>("select updated_at from public.red_lines where id = $1", [aliceLineId]);
      return rows[0].updated_at;
    });
    const row = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ text: string; updated_at: Date }>(
        "update public.red_lines set text = 'Any non-compete', updated_at = '2000-01-01' where id = $1 returning text, updated_at",
        [aliceLineId],
      );
      return rows[0];
    });
    expect(row.text).toBe("Any non-compete");
    expect(row.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("can delete one of their own", async () => {
    const affected = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string }>("insert into public.red_lines (text) values ('Temporary') returning id");
      return (await tx.query("delete from public.red_lines where id = $1", [rows[0].id])).affectedRows;
    });
    expect(affected).toBe(1);
    expect(await t.asUser(alice, count)).toBe(1);
  });
});

describe("red lines: another signed-in user", () => {
  it("cannot read the owner's red lines", async () => {
    const { byId, list } = await t.asUser(bob, async (tx) => ({
      byId: (await tx.query("select * from public.red_lines where id = $1", [aliceLineId])).rows,
      list: (await tx.query("select * from public.red_lines")).rows,
    }));
    expect(byId).toEqual([]);
    expect(list).toEqual([]);
  });

  it("cannot update one, including taking it over", async () => {
    const affected = await t.asUser(bob, async (tx) => [
      (await tx.query("update public.red_lines set text = 'mine now' where id = $1", [aliceLineId])).affectedRows,
      (await tx.query("update public.red_lines set user_id = $1 where id = $2", [bob, aliceLineId])).affectedRows,
    ]);
    expect(affected).toEqual([0, 0]);
  });

  it("cannot delete one", async () => {
    const affected = await t.asUser(bob, async (tx) => (await tx.query("delete from public.red_lines where id = $1", [aliceLineId])).affectedRows);
    expect(affected).toBe(0);
  });

  it("cannot insert a red line as the owner", async () => {
    await expect(
      t.asUser(bob, (tx) => tx.query("insert into public.red_lines (user_id, text) values ($1, 'planted')", [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot move their own red line onto the owner", async () => {
    const bobLineId = await t.asUser(bob, async (tx) => {
      const { rows } = await tx.query<{ id: string }>("insert into public.red_lines (text) values ('Net 60') returning id");
      return rows[0].id;
    });
    await expect(
      t.asUser(bob, (tx) => tx.query("update public.red_lines set user_id = $1 where id = $2", [alice, bobLineId])),
    ).rejects.toThrow(/row-level security/);
  });

  it("left the owner's red lines exactly as they were", async () => {
    const rows = await t.asUser(alice, async (tx) => (await tx.query("select text, user_id from public.red_lines")).rows);
    expect(rows).toEqual([{ text: "Any non-compete", user_id: alice }]);
  });
});

describe("red lines: signed out", () => {
  it("anon can't read, insert, update or delete", async () => {
    await expect(t.asAnon((tx) => tx.query("select * from public.red_lines"))).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon((tx) => tx.query("insert into public.red_lines (user_id, text) values ($1, 'x')", [alice])),
    ).rejects.toThrow(/permission denied/);
    await expect(t.asAnon((tx) => tx.query("update public.red_lines set text = 'x'"))).rejects.toThrow(/permission denied/);
    await expect(t.asAnon((tx) => tx.query("delete from public.red_lines"))).rejects.toThrow(/permission denied/);
  });

  it("an authenticated role with no user id in the token sees nothing and can't insert", async () => {
    const asNobody = <T,>(fn: (tx: Transaction) => Promise<T>) =>
      t.db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        return fn(tx);
      });
    expect((await asNobody((tx) => tx.query("select * from public.red_lines"))).rows).toEqual([]);
    await expect(asNobody((tx) => tx.query("insert into public.red_lines (text) values ('x')"))).rejects.toThrow(
      /null value in column "user_id"|row-level security/,
    );
  });
});

describe("red lines: the table", () => {
  it(`rejects blank text and text over ${RED_LINE_MAX_LENGTH} characters even when called directly`, async () => {
    await expect(t.asUser(alice, (tx) => tx.query("insert into public.red_lines (text) values ('   ')"))).rejects.toThrow(
      /red_lines_text_length/,
    );
    await expect(
      t.asUser(alice, (tx) => tx.query("insert into public.red_lines (text) values ($1)", ["x".repeat(RED_LINE_MAX_LENGTH + 1)])),
    ).rejects.toThrow(/red_lines_text_length/);
    const ok = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string }>("insert into public.red_lines (text) values ($1) returning id", [
        "x".repeat(RED_LINE_MAX_LENGTH),
      ]);
      await tx.query("delete from public.red_lines where id = $1", [rows[0].id]);
      return rows.length;
    });
    expect(ok).toBe(1);
  });

  it(`stops a user at ${RED_LINES_MAX_COUNT} red lines, without counting anyone else's`, async () => {
    const carol = await t.createUser("carol@example.test");
    await t.asUser(carol, async (tx) => {
      for (let i = 0; i < RED_LINES_MAX_COUNT; i++) {
        await tx.query("insert into public.red_lines (text) values ($1)", [`Red line ${i + 1}`]);
      }
    });
    await expect(t.asUser(carol, (tx) => tx.query("insert into public.red_lines (text) values ('One too many')"))).rejects.toThrow(
      /red_lines_limit/,
    );
    // Carol's full list doesn't count against Bob.
    await t.asUser(bob, (tx) => tx.query("insert into public.red_lines (text) values ('Still room')"));
  });

  it("deletes a user's red lines when the user is deleted", async () => {
    const dave = await t.createUser("dave@example.test");
    await t.asUser(dave, (tx) => tx.query("insert into public.red_lines (text) values ('Net 90')"));
    await t.db.query("delete from auth.users where id = $1", [dave]);
    const { rows } = await t.db.query("select * from public.red_lines where user_id = $1", [dave]);
    expect(rows).toEqual([]);
  });
});
