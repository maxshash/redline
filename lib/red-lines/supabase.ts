import type { SupabaseClient } from "@supabase/supabase-js";
import type { RedLine, RedLineStore } from "./red-lines";

interface RedLineRow {
  id: string;
  text: string;
  created_at: string;
}

const COLUMNS = "id, text, created_at";

function toRedLine(row: RedLineRow): RedLine {
  return { id: row.id, text: row.text, createdAt: row.created_at };
}

/**
 * The red lines store backed by a request-scoped Supabase client. Every query
 * runs as the signed-in user, so row-level security decides what is visible
 * and what can change.
 */
export function supabaseRedLineStore(supabase: SupabaseClient): RedLineStore {
  return {
    async currentUserId() {
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims?.sub) return null;
      return data.claims.sub;
    },

    async listForUser(userId: string) {
      // Row-level security already limits rows to this user; the filter lets
      // Postgres use the (user_id, created_at) index.
      const { data, error } = await supabase
        .from("red_lines")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error || !data) return null;
      return (data as RedLineRow[]).map(toRedLine);
    },

    async insert(text: string) {
      const { data, error } = await supabase.from("red_lines").insert({ text }).select(COLUMNS).single<RedLineRow>();
      if (error || !data) return null;
      return toRedLine(data);
    },

    async update(id: string, text: string) {
      const { data, error } = await supabase
        .from("red_lines")
        .update({ text })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle<RedLineRow>();
      if (error || !data) return null;
      return toRedLine(data);
    },

    async remove(id: string) {
      const { data, error } = await supabase.from("red_lines").delete().eq("id", id).select("id");
      if (error || !data) return false;
      return data.length > 0;
    },
  };
}
