/**
 * The user's red lines: validation and the add, edit and remove flows,
 * independent of Supabase.
 *
 * A red line is the reader's own words for something they want to hear about
 * in any document ("Payment later than 30 days after I invoice"). It is input
 * to the analysis, never output: flags come from Redline's own judgment, and
 * red-line matches are reported separately (ADR 0007).
 *
 * The owner is never part of a payload: the database fills `user_id` from the
 * signed-in session and row-level security refuses any other value.
 */

/** Mirrored by a check constraint in the red_lines migration. */
export const RED_LINE_MAX_LENGTH = 300;
/**
 * Enough for everything a person actually worries about in a contract, few
 * enough that each one is read on every analysis. Mirrored by a trigger in
 * the red_lines migration.
 */
export const RED_LINES_MAX_COUNT = 25;

export interface RedLine {
  id: string;
  text: string;
  createdAt: string;
}

/** What `analyzeDocument` needs from a red line. */
export interface RedLineInput {
  id: string;
  text: string;
}

/**
 * The storage boundary. The Supabase implementation lives in ./supabase;
 * tests pass a fake so the flows' own rules are what gets exercised.
 */
export interface RedLineStore {
  /** The signed-in user's id from verified session claims, or null. */
  currentUserId(): Promise<string | null>;
  /** The user's red lines, oldest first; null if the read failed. */
  listForUser(userId: string): Promise<RedLine[] | null>;
  /** Insert a red line with exactly this text; null if the insert failed. */
  insert(text: string): Promise<RedLine | null>;
  /** Replace one red line's text; null if it failed or no such row is visible. */
  update(id: string, text: string): Promise<RedLine | null>;
  /** Delete one red line; false if it failed or no such row is visible. */
  remove(id: string): Promise<boolean>;
}

export const RED_LINE_COPY = {
  missingText: "Write the red line first.",
  longText: `Keep a red line to ${RED_LINE_MAX_LENGTH} characters or fewer.`,
  duplicate: "That red line is already on your list.",
  full: `You have ${RED_LINES_MAX_COUNT} red lines, the most you can keep. Remove one to add another.`,
  missingId: "Couldn't tell which red line you meant. Refresh the page and try again.",
  addFailed: "Couldn't add the red line. Try again.",
  updateFailed: "Couldn't save that change. Refresh the page and try again.",
  removeFailed: "Couldn't remove the red line. Refresh the page and try again.",
  loadFailed: "Couldn't load your red lines. Refresh the page to try again.",
  signedOut: "Your session has ended. Sign in again to change your red lines.",
  unavailable: "Accounts aren't open yet, so red lines can't be saved.",
} as const;

export type RedLineFormState =
  | { status: "idle" }
  | { status: "saved"; redLine: RedLine }
  | { status: "removed"; id: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string }
  | { status: "signed-out"; message: string }
  | { status: "unavailable"; message: string };

export type TextValidation = { ok: true; text: string } | { ok: false; message: string };
export type IdValidation = { ok: true; id: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(input: unknown, name: string): unknown {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>)[name] : undefined;
}

/**
 * Check a red line's text. A red line is one line: runs of whitespace,
 * including line breaks, become a single space, and the ends are trimmed.
 */
export function validateRedLineText(input: unknown): TextValidation {
  const raw = field(input, "text");
  const text = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (text.length === 0) return { ok: false, message: RED_LINE_COPY.missingText };
  if (text.length > RED_LINE_MAX_LENGTH) return { ok: false, message: RED_LINE_COPY.longText };
  return { ok: true, text };
}

export function validateRedLineId(input: unknown): IdValidation {
  const raw = field(input, "id");
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!UUID.test(id)) return { ok: false, message: RED_LINE_COPY.missingId };
  return { ok: true, id };
}

function sameText(a: string, b: string): boolean {
  return a.toLocaleLowerCase("en-US") === b.toLocaleLowerCase("en-US");
}

type Session = { ok: true; store: RedLineStore; userId: string } | { ok: false; state: RedLineFormState };

async function session(store: RedLineStore | null): Promise<Session> {
  if (!store) return { ok: false, state: { status: "unavailable", message: RED_LINE_COPY.unavailable } };
  const userId = await store.currentUserId();
  if (!userId) return { ok: false, state: { status: "signed-out", message: RED_LINE_COPY.signedOut } };
  return { ok: true, store, userId };
}

/** Add a red line to the signed-in user's list. `store` is null when Supabase isn't configured. */
export async function runAddRedLine(input: unknown, store: RedLineStore | null): Promise<RedLineFormState> {
  const s = await session(store);
  if (!s.ok) return s.state;

  const validation = validateRedLineText(input);
  if (!validation.ok) return { status: "invalid", message: validation.message };

  const existing = await s.store.listForUser(s.userId);
  if (!existing) return { status: "error", message: RED_LINE_COPY.addFailed };
  if (existing.length >= RED_LINES_MAX_COUNT) return { status: "invalid", message: RED_LINE_COPY.full };
  if (existing.some((redLine) => sameText(redLine.text, validation.text))) {
    return { status: "invalid", message: RED_LINE_COPY.duplicate };
  }

  const saved = await s.store.insert(validation.text);
  if (!saved) return { status: "error", message: RED_LINE_COPY.addFailed };
  return { status: "saved", redLine: saved };
}

/** Replace the text of one of the signed-in user's red lines. */
export async function runUpdateRedLine(input: unknown, store: RedLineStore | null): Promise<RedLineFormState> {
  const s = await session(store);
  if (!s.ok) return s.state;

  const id = validateRedLineId(input);
  if (!id.ok) return { status: "invalid", message: id.message };
  const validation = validateRedLineText(input);
  if (!validation.ok) return { status: "invalid", message: validation.message };

  const existing = await s.store.listForUser(s.userId);
  if (!existing) return { status: "error", message: RED_LINE_COPY.updateFailed };
  if (existing.some((redLine) => redLine.id !== id.id && sameText(redLine.text, validation.text))) {
    return { status: "invalid", message: RED_LINE_COPY.duplicate };
  }

  const saved = await s.store.update(id.id, validation.text);
  if (!saved) return { status: "error", message: RED_LINE_COPY.updateFailed };
  return { status: "saved", redLine: saved };
}

/** Remove one of the signed-in user's red lines. */
export async function runRemoveRedLine(input: unknown, store: RedLineStore | null): Promise<RedLineFormState> {
  const s = await session(store);
  if (!s.ok) return s.state;

  const id = validateRedLineId(input);
  if (!id.ok) return { status: "invalid", message: id.message };

  const removed = await s.store.remove(id.id);
  if (!removed) return { status: "error", message: RED_LINE_COPY.removeFailed };
  return { status: "removed", id: id.id };
}

/**
 * The red lines an analysis runs with, and why. Loaded on the server from the
 * signed-in user's own rows, never from anything the browser sent.
 */
export type RedLinesForAnalysis =
  | { status: "loaded"; redLines: RedLineInput[] }
  | { status: "signed-out"; redLines: [] }
  | { status: "unavailable"; redLines: [] }
  | { status: "failed"; redLines: [] };

export async function loadRedLinesForAnalysis(store: RedLineStore | null): Promise<RedLinesForAnalysis> {
  if (!store) return { status: "unavailable", redLines: [] };
  const userId = await store.currentUserId();
  if (!userId) return { status: "signed-out", redLines: [] };
  const list = await store.listForUser(userId);
  if (!list) return { status: "failed", redLines: [] };
  return { status: "loaded", redLines: list.map(({ id, text }) => ({ id, text })) };
}
