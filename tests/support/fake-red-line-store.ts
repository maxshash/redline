import { randomUUID } from "node:crypto";
import type { RedLine, RedLineStore } from "@/lib/red-lines/red-lines";

export interface FakeRedLineStoreOptions {
  userId?: string | null;
  rows?: RedLine[];
  listFails?: boolean;
  writeFails?: boolean;
}

/**
 * A stand-in for the red_lines table at the RedLineStore boundary. It keeps
 * rows in memory, records every write exactly as received, and holds no
 * rules of its own.
 */
export function fakeRedLineStore(options: FakeRedLineStoreOptions = {}) {
  const rows: RedLine[] = [...(options.rows ?? [])];
  const writes: { op: "insert" | "update" | "remove"; args: unknown[] }[] = [];
  let lists = 0;
  const store: RedLineStore & { rows: RedLine[]; writes: typeof writes; readonly lists: number } = {
    rows,
    writes,
    get lists() {
      return lists;
    },
    async currentUserId() {
      return options.userId === undefined ? "user-a" : options.userId;
    },
    async listForUser() {
      lists++;
      return options.listFails ? null : rows.map((row) => ({ ...row }));
    },
    async insert(text) {
      writes.push({ op: "insert", args: [text] });
      if (options.writeFails) return null;
      const row = { id: randomUUID(), text, createdAt: "2026-09-16T12:00:00Z" };
      rows.push(row);
      return { ...row };
    },
    async update(id, text) {
      writes.push({ op: "update", args: [id, text] });
      const row = rows.find((r) => r.id === id);
      if (options.writeFails || !row) return null;
      row.text = text;
      return { ...row };
    },
    async remove(id) {
      writes.push({ op: "remove", args: [id] });
      const index = rows.findIndex((r) => r.id === id);
      if (options.writeFails || index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
  return store;
}

export function redLineRow(text: string, id: string = randomUUID()): RedLine {
  return { id, text, createdAt: "2026-09-16T12:00:00Z" };
}
