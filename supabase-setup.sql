create table if not exists public.users (
  user_id text primary key references auth.users(id) on delete cascade,
  username text,
  reputation int not null default 0,
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id text references public.users(user_id) on delete cascade,
  vibe_type text not null check (vibe_type in ('chill','excited','anxious','sad','angry','happy','tired','confused')),
  location text,
  notes text,
  upvotes int not null default 0,
  downvotes int not null default 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists upvotes int not null default 0;
alter table public.reports add column if not exists downvotes int not null default 0;
alter table public.reports add column if not exists latitude double precision;
alter table public.reports add column if not exists longitude double precision;

create table if not exists public.votes (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  report_id bigint not null references public.reports(id) on delete cascade,
  vote_type text not null check (vote_type in ('upvote','downvote')),
  created_at timestamptz not null default now(),
  unique (user_id, report_id)
);

create index if not exists votes_report_id_idx on public.votes(report_id);
create index if not exists votes_user_id_idx on public.votes(user_id);

alter table public.users enable row level security;
alter table public.reports disable row level security;
alter table public.votes enable row level security;

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists reports_select_all on public.reports;
create policy reports_select_all on public.reports
  for select to anon, authenticated
  using (true);

-- Allow all inserts (both authenticated and anonymous)
drop policy if exists reports_insert_all on public.reports;
create policy reports_insert_all on public.reports
  for insert to anon, authenticated
  with check (true);

drop policy if exists reports_update_own on public.reports;
create policy reports_update_own on public.reports
  for update to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists reports_delete_own on public.reports;
create policy reports_delete_own on public.reports
  for delete to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists votes_select_own on public.votes;
create policy votes_select_own on public.votes
  for select to authenticated
  using (user_id::text = auth.uid()::text);

drop policy if exists votes_insert_own on public.votes;
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists votes_update_own on public.votes;
create policy votes_update_own on public.votes
  for update to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
  for delete to authenticated
  using (user_id::text = auth.uid()::text);

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

-- Geofence Feature Tables
create table if not exists public.geofences (
  id bigint generated always as identity primary key,
  name text not null,
  zone_type text not null check (zone_type in ('safe','risk')),
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 500,
  description text,
  created_by text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_geofence_settings (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  geofence_enabled boolean not null default false,
  notify_safe_zones boolean not null default true,
  notify_risk_zones boolean not null default true,
  notification_radius int not null default 100, -- meters
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.geofence_events (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  geofence_id bigint not null references public.geofences(id) on delete cascade,
  event_type text not null check (event_type in ('enter','exit')),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists geofences_zone_type_idx on public.geofences(zone_type);
create index if not exists geofences_active_idx on public.geofences(is_active);
create index if not exists geofence_events_user_id_idx on public.geofence_events(user_id);
create index if not exists geofence_events_created_at_idx on public.geofence_events(created_at);

-- Row Level Security for geofence tables
alter table public.geofences enable row level security;
alter table public.user_geofence_settings enable row level security;
alter table public.geofence_events enable row level security;

-- Geofences policies (public read, authenticated create/update)
drop policy if exists geofences_select_all on public.geofences;
create policy geofences_select_all on public.geofences
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists geofences_insert_authenticated on public.geofences;
create policy geofences_insert_authenticated on public.geofences
  for insert to authenticated
  with check (true);

drop policy if exists geofences_update_creator on public.geofences;
create policy geofences_update_creator on public.geofences
  for update to authenticated
  using (created_by = auth.uid()::text)
  with check (created_by = auth.uid()::text);

-- User geofence settings policies
drop policy if exists user_geofence_settings_select_own on public.user_geofence_settings;
create policy user_geofence_settings_select_own on public.user_geofence_settings
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists user_geofence_settings_insert_own on public.user_geofence_settings;
create policy user_geofence_settings_insert_own on public.user_geofence_settings
  for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists user_geofence_settings_update_own on public.user_geofence_settings;
create policy user_geofence_settings_update_own on public.user_geofence_settings
  for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- Geofence events policies
drop policy if exists geofence_events_select_own on public.geofence_events;
create policy geofence_events_select_own on public.geofence_events
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists geofence_events_insert_own on public.geofence_events;
create policy geofence_events_insert_own on public.geofence_events
  for insert to authenticated
  with check (user_id = auth.uid()::text);

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

-- Activity Suggestions Feature Tables
create table if not exists public.mood_votes (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  mood_type text not null check (mood_type in ('chill','excited','anxious','sad','angry','happy','tired','confused')),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_suggestions (
  id bigint generated always as identity primary key,
  mood_type text not null check (mood_type in ('chill','excited','anxious','sad','angry','happy','tired','confused')),
  place_name text not null,
  place_type text not null, -- e.g., 'cafe', 'park', 'restaurant'
  latitude double precision not null,
  longitude double precision not null,
  osm_id text, -- OpenStreetMap ID for reference
  created_at timestamptz not null default now()
);

-- Indexes for mood votes
create index if not exists mood_votes_user_id_idx on public.mood_votes(user_id);
create index if not exists mood_votes_mood_type_idx on public.mood_votes(mood_type);
create index if not exists mood_votes_created_at_idx on public.mood_votes(created_at);

-- Row Level Security for mood votes
alter table public.mood_votes enable row level security;

-- Mood votes policies (authenticated users only)
drop policy if exists mood_votes_select_own on public.mood_votes;
create policy mood_votes_select_own on public.mood_votes
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists mood_votes_insert_own on public.mood_votes;
create policy mood_votes_insert_own on public.mood_votes
  for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists mood_votes_delete_own on public.mood_votes;
create policy mood_votes_delete_own on public.mood_votes
  for delete to authenticated
  using (user_id = auth.uid()::text);

-- Indexes for activity suggestions
create index if not exists activity_suggestions_mood_type_idx on public.activity_suggestions(mood_type);
create index if not exists activity_suggestions_location_idx on public.activity_suggestions(latitude, longitude);

-- Row Level Security for activity suggestions
alter table public.activity_suggestions enable row level security;

-- Activity suggestions policies (public read, authenticated insert)
drop policy if exists activity_suggestions_select_all on public.activity_suggestions;
create policy activity_suggestions_select_all on public.activity_suggestions
  for select to anon, authenticated
  using (true);

drop policy if exists activity_suggestions_insert_authenticated on public.activity_suggestions;
create policy activity_suggestions_insert_authenticated on public.activity_suggestions
  for insert to authenticated
  with check (true);
