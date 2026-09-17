-- Analyses: Redline's saved check of a kept document. The summary, flags,
-- counter-offers and red-line matches, as JSON, plus the red lines the check
-- ran with, so a reopened analysis shows what it was checked against even
-- after the user's list has changed.
--
-- Every run is kept; the library shows the latest one per document. The app
-- checks every citation in `result` against the document's text before it
-- writes a row and again every time it reads one (lib/analysis/stored.ts).
--
-- Every row belongs to one user and only that user can see or change it.
-- Access is enforced here, by row-level security, not by the app.

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  result jsonb not null,
  red_lines_used jsonb not null,
  created_at timestamptz not null default now(),

  constraint analyses_result_is_object check (jsonb_typeof(result) = 'object'),
  constraint analyses_red_lines_used_is_array check (jsonb_typeof(red_lines_used) = 'array')
);

comment on table public.analyses is
  'Saved analyses of a user''s kept documents, private to that user. Latest per document is shown.';

create index analyses_document_id_created_at_idx
  on public.analyses (document_id, created_at desc);

-- Deleting a user cascades through this column.
create index analyses_user_id_idx
  on public.analyses (user_id);

alter table public.analyses enable row level security;

-- Signed-in users only. Signed-out (anon) requests get no access at all.
revoke all on table public.analyses from anon;
grant select, insert, update, delete on table public.analyses to authenticated;

create policy "analyses: owner can select"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- The referenced document must be the caller's own too. The subquery runs as
-- the caller, so documents' own row-level security applies to it as well:
-- knowing another user's document id is not enough to attach to it.
create policy "analyses: owner can insert for own document"
  on public.analyses for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );

create policy "analyses: owner can update for own document"
  on public.analyses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );

create policy "analyses: owner can delete"
  on public.analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id);
