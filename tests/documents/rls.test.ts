import type { Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseTestDb, type SupabaseTestDb } from "../support/supabase-db";
import { loadFixture } from "../support/fixtures";

/**
 * Row-level security on public.documents, run against the real migration SQL.
 * Every query goes through the `authenticated` or `anon` role, the way
 * Supabase's API runs a request, so the policies (not the app) decide.
 */

let t: SupabaseTestDb;
let alice: string;
let bob: string;
let aliceDocId: string;

const { text } = loadFixture("adhesion-contract");

beforeAll(async () => {
  t = await createSupabaseTestDb();
  alice = await t.createUser("alice@example.test");
  bob = await t.createUser("bob@example.test");
}, 60_000);

afterAll(async () => {
  await t?.close();
});

describe("documents: the owner", () => {
  it("can insert a document without naming a user; it is theirs", async () => {
    const row = await t.asUser(alice, async (tx) => {
      const { rows } = await tx.query<{ id: string; user_id: string }>(
        "insert into public.documents (title, text) values ($1, $2) returning id, user_id",
        ["Brackenfold consulting agreement", text],
      );
      return rows[0];
    });
    expect(row.user_id).toBe(alice);
    aliceDocId = row.id;
  });

  it("can read it back, by id and in a list, with the text intact", async () => {
    const { byId, list } = await t.asUser(alice, async (tx) => ({
      byId: (await tx.query<{ text: string }>("select text from public.documents where id = $1", [aliceDocId])).rows,
      list: (await tx.query<{ id: string }>("select id from public.documents order by created_at desc")).rows,
    }));
    expect(byId).toEqual([{ text }]);
    expect(list.map((r) => r.id)).toEqual([aliceDocId]);
  });
});

describe("documents: another signed-in user", () => {
  it("cannot select the owner's document by id or in a list", async () => {
    const { byId, list } = await t.asUser(bob, async (tx) => ({
      byId: (await tx.query("select * from public.documents where id = $1", [aliceDocId])).rows,
      list: (await tx.query("select * from public.documents")).rows,
    }));
    expect(byId).toEqual([]);
    expect(list).toEqual([]);
  });

  it("cannot update it, including taking it over", async () => {
    const affected = await t.asUser(bob, async (tx) => {
      const a = await tx.query("update public.documents set title = 'mine now' where id = $1", [aliceDocId]);
      const b = await tx.query("update public.documents set user_id = $1 where id = $2", [bob, aliceDocId]);
      return [a.affectedRows, b.affectedRows];
    });
    expect(affected).toEqual([0, 0]);
  });

  it("cannot delete it", async () => {
    const affected = await t.asUser(bob, async (tx) => {
      return (await tx.query("delete from public.documents where id = $1", [aliceDocId])).affectedRows;
    });
    expect(affected).toBe(0);
  });

  it("cannot insert a document as the owner", async () => {
    await expect(
      t.asUser(bob, (tx) =>
        tx.query("insert into public.documents (user_id, title, text) values ($1, 'planted', 'planted text')", [alice]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot move their own document onto the owner", async () => {
    const bobDocId = await t.asUser(bob, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into public.documents (title, text) values ('Bob lease', 'Rent is due monthly.') returning id",
      );
      return rows[0].id;
    });
    await expect(
      t.asUser(bob, (tx) => tx.query("update public.documents set user_id = $1 where id = $2", [alice, bobDocId])),
    ).rejects.toThrow(/row-level security/);
  });

  it("left the owner's document exactly as it was", async () => {
    const rows = await t.asUser(alice, async (tx) => {
      return (await tx.query("select title, user_id from public.documents")).rows;
    });
    expect(rows).toEqual([{ title: "Brackenfold consulting agreement", user_id: alice }]);
  });
});

describe("documents: signed out", () => {
  it("anon can't read any document", async () => {
    await expect(t.asAnon((tx) => tx.query("select * from public.documents"))).rejects.toThrow(/permission denied/);
  });

  it("anon can't insert one", async () => {
    await expect(
      t.asAnon((tx) => tx.query("insert into public.documents (user_id, title, text) values ($1, 'x', 'y')", [alice])),
    ).rejects.toThrow(/permission denied/);
  });

  it("an authenticated role with no user id in the token sees nothing and can't insert", async () => {
    const asNobody = <T,>(fn: (tx: Transaction) => Promise<T>) =>
      t.db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        return fn(tx);
      });
    expect((await asNobody((tx) => tx.query("select * from public.documents"))).rows).toEqual([]);
    await expect(
      asNobody((tx) => tx.query("insert into public.documents (title, text) values ('x', 'y')")),
    ).rejects.toThrow(/null value in column "user_id"|row-level security/);
  });
});

describe("documents: the table", () => {
  it("rejects a blank title or text even when called directly", async () => {
    await expect(
      t.asUser(alice, (tx) => tx.query("insert into public.documents (title, text) values ('   ', 'text')")),
    ).rejects.toThrow(/documents_title_length/);
    await expect(
      t.asUser(alice, (tx) => tx.query("insert into public.documents (title, text) values ('Title', '')")),
    ).rejects.toThrow(/documents_text_length/);
  });

  it("deletes a user's documents when the user is deleted", async () => {
    const carol = await t.createUser("carol@example.test");
    await t.asUser(carol, (tx) => tx.query("insert into public.documents (title, text) values ('C', 'Some text.')"));
    await t.db.query("delete from auth.users where id = $1", [carol]);
    const { rows } = await t.db.query("select * from public.documents where user_id = $1", [carol]);
    expect(rows).toEqual([]);
  });
});
