"use server";

import { revalidatePath } from "next/cache";
import {
  runAddRedLine,
  runRemoveRedLine,
  runUpdateRedLine,
  type RedLineFormState,
} from "@/lib/red-lines/red-lines";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Change the signed-in user's red lines. Each action is reachable by a direct
 * POST, so the session is checked and the payload validated inside the
 * `run*` functions, and row-level security has the final say.
 */

async function store() {
  const supabase = await createSupabaseServerClient();
  return supabase ? supabaseRedLineStore(supabase) : null;
}

function refreshed(state: RedLineFormState): RedLineFormState {
  if (state.status === "saved" || state.status === "removed") revalidatePath("/red-lines");
  return state;
}

export async function addRedLine(_previous: RedLineFormState, formData: FormData): Promise<RedLineFormState> {
  return refreshed(await runAddRedLine({ text: formData.get("text") }, await store()));
}

export async function updateRedLine(_previous: RedLineFormState, formData: FormData): Promise<RedLineFormState> {
  return refreshed(await runUpdateRedLine({ id: formData.get("id"), text: formData.get("text") }, await store()));
}

export async function removeRedLine(_previous: RedLineFormState, formData: FormData): Promise<RedLineFormState> {
  return refreshed(await runRemoveRedLine({ id: formData.get("id") }, await store()));
}
