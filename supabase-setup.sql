-- Supabase schema & RLS for users, reports, votes + counters
-- Clean SQL (no backslashes), safe to run multiple times

-- Users table mapped to auth.users
create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  reputation int not null default 0,
  language text not null default 'en',
  created_at timestamptz not null default now()
);

-- Reports table
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(user_id) on delete cascade,
  vibe_type text not null check (vibe_type in ('crowded','noisy','festive','calm','suspicious','dangerous')),
  location text,
  notes text,
  upvotes int not null default 0,
  downvotes int not null default 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

-- Ensure columns exist
alter table public.reports add column if not exists upvotes int not null default 0;
alter table public.reports add column if not exists downvotes int not null default 0;
alter table public.reports add column if not exists latitude double precision;
alter table public.reports add column if not exists longitude double precision;

-- Votes table (one vote per user per report)
create table if not exists public.votes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(user_id) on delete cascade,
  report_id bigint not null references public.reports(id) on delete cascade,
  vote_type text not null check (vote_type in ('upvote','downvote')),
  created_at timestamptz not null default now(),
  unique (user_id, report_id)
);

create index if not exists votes_report_id_idx on public.votes(report_id);
create index if not exists votes_user_id_idx   on public.votes(user_id);

-- Enable RLS
alter table public.users   enable row level security;
alter table public.reports enable row level security;
alter table public.votes   enable row level security;

-- Users policies (self-access)
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Reports policies
drop policy if exists reports_select_all on public.reports;
create policy reports_select_all on public.reports
  for select to anon, authenticated
  using (true);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reports_update_own on public.reports;
create policy reports_update_own on public.reports
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists reports_delete_own on public.reports;
create policy reports_delete_own on public.reports
  for delete to authenticated
  using (user_id = auth.uid());

-- Votes policies
-- Select: only current user&#39;s votes; anon sees none but request succeeds
drop policy if exists votes_select_own on public.votes;
create policy votes_select_own on public.votes
  for select to anon, authenticated
  using (user_id = auth.uid());

drop policy if exists votes_insert_own on public.votes;
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists votes_update_own on public.votes;
create policy votes_update_own on public.votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
  for delete to authenticated
  using (user_id = auth.uid());

-- Triggers to maintain upvotes/downvotes counters
create or replace function public._votes_ai_update_report_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vote_type = 'upvote' then
    update public.reports set upvotes = coalesce(upvotes,0) + 1 where id = new.report_id;
  elsif new.vote_type = 'downvote' then
    update public.reports set downvotes = coalesce(downvotes,0) + 1 where id = new.report_id;
  end if;
  return null;
end;
$$;

create or replace function public._votes_ad_update_report_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.vote_type = 'upvote' then
    update public.reports set upvotes = greatest(coalesce(upvotes,0) - 1, 0) where id = old.report_id;
  elsif old.vote_type = 'downvote' then
    update public.reports set downvotes = greatest(coalesce(downvotes,0) - 1, 0) where id = old.report_id;
  end if;
  return null;
end;
$$;

create or replace function public._votes_au_update_report_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.vote_type = new.vote_type then
    return null;
  end if;

  if old.vote_type = 'upvote' then
    update public.reports set upvotes = greatest(coalesce(upvotes,0) - 1, 0) where id = new.report_id;
  elsif old.vote_type = 'downvote' then
    update public.reports set downvotes = greatest(coalesce(downvotes,0) - 1, 0) where id = new.report_id;
  end if;

  if new.vote_type = 'upvote' then
    update public.reports set upvotes = coalesce(upvotes,0) + 1 where id = new.report_id;
  elsif new.vote_type = 'downvote' then
    update public.reports set downvotes = coalesce(downvotes,0) + 1 where id = new.report_id;
  end if;

  return null;
end;
$$;

drop trigger if exists votes_after_insert on public.votes;
create trigger votes_after_insert
after insert on public.votes
for each row execute function public._votes_ai_update_report_counts();

drop trigger if exists votes_after_delete on public.votes;
create trigger votes_after_delete
after delete on public.votes
for each row execute function public._votes_ad_update_report_counts();

drop trigger if exists votes_after_update on public.votes;
create trigger votes_after_update
after update of vote_type on public.votes
for each row execute function public._votes_au_update_report_counts();
