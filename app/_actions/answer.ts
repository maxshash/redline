"use server";

import { runAskQuestion, type AskState } from "@/lib/answer/run";
import { modelClientFromEnv } from "@/lib/model/client";

/**
 * Answer a question about extracted document text, from that text alone.
 * Public: no account or Supabase needed, and nothing is stored. The OpenRouter
 * key stays on the server. The payload is untrusted and is validated inside
 * `runAskQuestion`; only its text and question are used.
 */
export async function askQuestion(input: { text: string; question: string }): Promise<AskState> {
  return runAskQuestion(input, { model: () => modelClientFromEnv() });
}
