"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveDocument } from "@/app/_actions/documents";
import {
  DOCUMENT_COPY,
  TITLE_MAX_LENGTH,
  validateNewDocument,
  type SaveDocumentState,
} from "@/lib/documents/documents";
import type { DocumentInHand, Keeping } from "./analyze-workspace";

const bodyClass = "max-w-[60ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft";
const linkClass = "font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";

const ACCOUNT_ONLY = "Documents are only kept with an account.";

function AccountOnlyLine({ keeping }: { keeping: Exclude<Keeping, "signed-in"> }) {
  if (keeping === "unavailable") {
    return (
      <p className={bodyClass}>
        {ACCOUNT_ONLY} Accounts aren&apos;t open yet, so this one won&apos;t be saved.
      </p>
    );
  }
  return (
    <p className={bodyClass}>
      {ACCOUNT_ONLY}{" "}
      <Link href="/sign-in?next=%2Fanalyze" className={linkClass}>
        Sign in
      </Link>{" "}
      to keep one. You&apos;ll need to add this document again after you sign in.
    </p>
  );
}

/**
 * Offer to keep the document in the library. Saving is a choice the reader
 * makes, never automatic. Only the title and the extracted text are sent.
 */
export function KeepDocument({
  keeping,
  document,
  onTitleChange,
}: {
  keeping: Keeping;
  document: DocumentInHand;
  onTitleChange: (title: string) => void;
}) {
  const [state, setState] = useState<SaveDocumentState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (keeping !== "signed-in" || state.status === "unavailable" || state.status === "signed-out") {
    const line: Exclude<Keeping, "signed-in"> =
      state.status === "unavailable" || keeping === "unavailable" ? "unavailable" : "signed-out";
    return (
      <div className="px-5 pb-6 pt-4 sm:px-7">
        <h2 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">Keeping it</h2>
        <AccountOnlyLine keeping={line} />
      </div>
    );
  }

  if (state.status === "saved") {
    return (
      <div className="px-5 pb-6 pt-4 sm:px-7" role="status">
        <h2 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">Saved to your library</h2>
        <p className={bodyClass}>
          Only the text was saved.{" "}
          <Link href="/library" className={linkClass}>
            Open your library
          </Link>
        </p>
      </div>
    );
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { title: document.title, text: document.text };
    const check = validateNewDocument(payload);
    if (!check.ok) {
      setState({ status: "invalid", message: check.message });
      return;
    }
    startTransition(async () => {
      try {
        setState(await saveDocument(check.document));
      } catch {
        setState({ status: "error", message: DOCUMENT_COPY.saveFailed });
      }
    });
  }

  const message = state.status === "invalid" || state.status === "error" ? state.message : null;

  return (
    <form onSubmit={save} className="px-5 pb-6 pt-4 sm:px-7">
      <h2 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">Keep it in your library</h2>
      <p className={bodyClass}>Saves the title and the text shown here. The file isn&apos;t saved.</p>

      {message && (
        <p
          role="alert"
          className="mt-4 max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink"
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-x-4 gap-y-4 pt-4">
        <div className="w-full max-w-[28rem]">
          <label
            htmlFor="document-title"
            className="block font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft"
          >
            Title
          </label>
          <input
            id="document-title"
            type="text"
            value={document.title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => onTitleChange(event.currentTarget.value)}
            className="mt-1.5 block w-full border-[3px] border-ink bg-panel-field px-3 py-2.5 text-[1rem] text-ink"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait disabled:bg-ink disabled:text-panel-field"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
