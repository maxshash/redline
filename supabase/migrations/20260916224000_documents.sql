-- Documents: the extracted text of a contract a user chose to keep.
-- Only text is stored. The original file never leaves the browser.
--
-- Every row belongs to one user and only that user can see or change it.
-- Access is enforced here, by row-level security, not by the app.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  text text not null,
  created_at timestamptz not null default now(),

  -- Mirrors the save action's limits, so a direct API call can't get around them.
  constraint documents_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint documents_text_length check (char_length(btrim(text)) between 1 and 200000)
);

comment on table public.documents is
  'Extracted document text, private to the uploading user. Never the original file.';

create index documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

-- Signed-in users only. Signed-out (anon) requests get no access at all.
revoke all on table public.documents from anon;
grant select, insert, update, delete on table public.documents to authenticated;

create policy "documents: owner can select"
  on public.documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "documents: owner can insert"
  on public.documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "documents: owner can update"
  on public.documents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "documents: owner can delete"
  on public.documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);
