-- Red lines: the user's own list of things they want to hear about in any
-- document they check. Each analysis reports a red-line match whenever a
-- clause is about an entry, independently of Redline's severity tiers
-- (ADR 0007).
--
-- Every row belongs to one user and only that user can see or change it.
-- Access is enforced here, by row-level security, not by the app.

create table public.red_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mirrors RED_LINE_MAX_LENGTH in lib/red-lines, so a direct API call can't get around it.
  constraint red_lines_text_length check (char_length(btrim(text)) between 1 and 300)
);

comment on table public.red_lines is
  'A user''s own red lines, private to that user. Drives red-line matches in each analysis.';

create index red_lines_user_id_created_at_idx
  on public.red_lines (user_id, created_at);

-- Keep updated_at honest without trusting the client to send it.
create function public.red_lines_touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
  as $$
    begin
      new.updated_at := now();
      return new;
    end
  $$;

create trigger red_lines_touch_updated_at
  before update on public.red_lines
  for each row execute function public.red_lines_touch_updated_at();

-- Mirrors RED_LINES_MAX_COUNT in lib/red-lines. The count runs as the caller,
-- so row-level security limits it to the caller's own rows.
create function public.red_lines_enforce_limit() returns trigger
  language plpgsql
  set search_path = ''
  as $$
    begin
      if (select count(*) from public.red_lines where user_id = new.user_id) >= 25 then
        raise exception 'red_lines_limit: at most 25 red lines per user'
          using errcode = 'check_violation';
      end if;
      return new;
    end
  $$;

create trigger red_lines_enforce_limit
  before insert on public.red_lines
  for each row execute function public.red_lines_enforce_limit();

alter table public.red_lines enable row level security;

-- Signed-in users only. Signed-out (anon) requests get no access at all.
revoke all on table public.red_lines from anon;
grant select, insert, update, delete on table public.red_lines to authenticated;

create policy "red_lines: owner can select"
  on public.red_lines for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "red_lines: owner can insert"
  on public.red_lines for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "red_lines: owner can update"
  on public.red_lines for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "red_lines: owner can delete"
  on public.red_lines for delete
  to authenticated
  using ((select auth.uid()) = user_id);
