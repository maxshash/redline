import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { openSavedDocument } from "@/lib/library/library";
import { modelClientFromEnv } from "@/lib/model/client";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SavedDocument } from "./_components/saved-document";

/** Checking a document that has no saved check runs a server action here, and a model call can take a while. */
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "Redline: saved document",
};

/**
 * A kept document, reopened with its latest saved check. Everything shown is
 * read from storage and re-verified against the stored text; opening the page
 * never calls the model.
 */
export default async function SavedDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const state = await openSavedDocument(id, {
    store: supabase ? supabaseDocumentStore(supabase) : null,
    redLineStore: supabase ? supabaseRedLineStore(supabase) : null,
    model: () => modelClientFromEnv(),
  });

  if (state.status === "not-found") notFound();

  if (state.status !== "found") {
    return (
      <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
        <p
          role="alert"
          className="max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink"
        >
          {state.message}
        </p>
      </section>
    );
  }

  return <SavedDocument key={state.document.id} document={state.document} check={state.check} />;
}
