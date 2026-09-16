"use client";

import { useActionState, useId, useState } from "react";
import { addRedLine, removeRedLine, updateRedLine } from "@/app/_actions/red-lines";
import {
  RED_LINES_MAX_COUNT,
  RED_LINE_COPY,
  RED_LINE_MAX_LENGTH,
  type RedLine,
  type RedLineFormState,
} from "@/lib/red-lines/red-lines";

const IDLE: RedLineFormState = { status: "idle" };

const narrowClass = "font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";
const bodyClass = "max-w-[62ch] pt-2 text-[1rem] leading-[1.55] text-ink-soft";
const inputClass = "mt-1.5 block w-full border-[3px] border-ink bg-panel-field px-3 py-2.5 text-[1rem] text-ink";
const primaryButtonClass =
  "border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait disabled:bg-ink disabled:text-panel-field";
const smallButtonClass =
  "cursor-pointer border-[3px] border-ink bg-panel-field px-3 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait";
const textButtonClass =
  "cursor-pointer text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px] disabled:cursor-wait";

export const RED_LINES_PAGE_COPY = {
  emptyHeading: "No red lines yet",
  emptyBody:
    "A red line is something you always want to know about before you sign, written in your own words. Redline tells you whenever a document mentions it, whether or not it thinks the clause is dangerous.",
  lead: "Redline checks every document against this list and tells you when one of these comes up, whether or not it thinks the clause is dangerous.",
  addLabel: "Add a red line",
  addHint: "For example: Payment later than 30 days after I invoice.",
  add: "Add",
  adding: "Adding…",
  full: RED_LINE_COPY.full,
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  remove: "Remove",
  removing: "Removing…",
  editLabel: "Red line",
} as const;

function Alert({ state }: { state: RedLineFormState }) {
  if (state.status === "idle" || state.status === "saved" || state.status === "removed") return null;
  return (
    <p role="alert" className="mt-3 max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink">
      {state.message}
    </p>
  );
}

/** The editable list. The server page passes the rows; every change goes through a server action. */
export function RedLineList({ redLines }: { redLines: readonly RedLine[] }) {
  const full = redLines.length >= RED_LINES_MAX_COUNT;

  return (
    <>
      {redLines.length === 0 ? (
        <div className="pt-5">
          <h2 className="text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em]">
            {RED_LINES_PAGE_COPY.emptyHeading}
          </h2>
          <p className={bodyClass}>{RED_LINES_PAGE_COPY.emptyBody}</p>
        </div>
      ) : (
        <p className={`${bodyClass} pt-3.5`}>{RED_LINES_PAGE_COPY.lead}</p>
      )}

      {full ? <p className={`${bodyClass} pt-5 font-bold text-ink`}>{RED_LINES_PAGE_COPY.full}</p> : <AddForm />}

      {redLines.length > 0 && (
        <ul className="mt-6 border-t border-ink">
          {redLines.map((redLine) => (
            <RedLineRow key={redLine.id} redLine={redLine} />
          ))}
        </ul>
      )}
    </>
  );
}

function AddForm() {
  // A new key after each add clears the field.
  const [added, setAdded] = useState(0);
  const [state, formAction, pending] = useActionState<RedLineFormState, FormData>(async (previous, formData) => {
    const next = await addRedLine(previous, formData);
    if (next.status === "saved") setAdded((n) => n + 1);
    return next;
  }, IDLE);
  const inputId = useId();

  return (
    <form action={formAction} className="pt-5" noValidate>
      <label htmlFor={inputId} className={`block ${narrowClass}`}>
        {RED_LINES_PAGE_COPY.addLabel}
      </label>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="w-full max-w-[40rem]">
          <input
            key={added}
            id={inputId}
            name="text"
            type="text"
            required
            maxLength={RED_LINE_MAX_LENGTH}
            autoComplete="off"
            aria-describedby={`${inputId}-hint`}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? RED_LINES_PAGE_COPY.adding : RED_LINES_PAGE_COPY.add}
        </button>
      </div>
      <p id={`${inputId}-hint`} className="pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">
        {RED_LINES_PAGE_COPY.addHint}
      </p>
      <Alert state={state} />
    </form>
  );
}

function RedLineRow({ redLine }: { redLine: RedLine }) {
  const [editing, setEditing] = useState(false);
  const inputId = useId();

  const [editState, editAction, saving] = useActionState<RedLineFormState, FormData>(async (previous, formData) => {
    const next = await updateRedLine(previous, formData);
    if (next.status === "saved") setEditing(false);
    return next;
  }, IDLE);
  const [removeState, removeAction, removing] = useActionState<RedLineFormState, FormData>(removeRedLine, IDLE);

  if (editing) {
    return (
      <li className="hairline py-3.5">
        <form action={editAction} noValidate>
          <input type="hidden" name="id" value={redLine.id} />
          <label htmlFor={inputId} className={`block ${narrowClass}`}>
            {RED_LINES_PAGE_COPY.editLabel}
          </label>
          <input
            id={inputId}
            name="text"
            type="text"
            required
            maxLength={RED_LINE_MAX_LENGTH}
            defaultValue={redLine.text}
            autoComplete="off"
            autoFocus
            className={`${inputClass} max-w-[40rem]`}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
            <button type="submit" disabled={saving} className={smallButtonClass}>
              {saving ? RED_LINES_PAGE_COPY.saving : RED_LINES_PAGE_COPY.save}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className={textButtonClass}>
              {RED_LINES_PAGE_COPY.cancel}
            </button>
          </div>
          <Alert state={editState} />
        </form>
      </li>
    );
  }

  return (
    <li className="hairline py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <p className="flex min-w-0 max-w-[62ch] gap-3">
          <span aria-hidden="true" className="mt-[0.45rem] h-2 w-2 shrink-0 bg-overprint" />
          <span className="overprint-stamp min-w-0 break-words text-[0.8125rem] leading-[1.45]">{redLine.text}</span>
        </p>
        <div className="flex shrink-0 items-center gap-x-3">
          <button type="button" onClick={() => setEditing(true)} className={smallButtonClass}>
            {RED_LINES_PAGE_COPY.edit}
            <span className="sr-only">: {redLine.text}</span>
          </button>
          <form action={removeAction}>
            <input type="hidden" name="id" value={redLine.id} />
            <button type="submit" disabled={removing} className={smallButtonClass}>
              {removing ? RED_LINES_PAGE_COPY.removing : RED_LINES_PAGE_COPY.remove}
              <span className="sr-only">: {redLine.text}</span>
            </button>
          </form>
        </div>
      </div>
      <Alert state={removeState} />
    </li>
  );
}
