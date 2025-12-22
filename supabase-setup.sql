-- User Verification System
alter table public.users add column if not exists verification_level text default 'basic'
  check (verification_level in ('basic', 'verified', 'trusted'));
alter table public.users add column if not exists verified_at timestamptz;
alter table public.users add column if not exists verification_badge_earned_at timestamptz;

-- Report Credibility System
alter table public.reports add column if not exists credibility_score decimal(3,2) default 0.5;
alter table public.reports add column if not exists validation_count integer default 0;
alter table public.reports add column if not exists last_validated_at timestamptz;

-- Report Validations Table (separate from regular votes)
create table if not exists public.report_validations (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports(id) on delete cascade,
  user_id text not null references public.users(user_id) on delete cascade,
  validation_type text not null check (validation_type in ('confirm', 'deny')),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Indexes for performance
create index if not exists report_validations_report_id_idx on public.report_validations(report_id);
create index if not exists report_validations_user_id_idx on public.report_validations(user_id);

-- Row Level Security for validations
alter table public.report_validations enable row level security;

-- Allow authenticated users to read all validations (for stats) but only manage their own
drop policy if exists report_validations_select_all on public.report_validations;
create policy report_validations_select_all on public.report_validations
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists report_validations_insert_own on public.report_validations;
create policy report_validations_insert_own on public.report_validations
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists report_validations_update_own on public.report_validations;
create policy report_validations_update_own on public.report_validations
  for update to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists report_validations_delete_own on public.report_validations;
create policy report_validations_delete_own on public.report_validations
  for delete to authenticated
  using (user_id::text = auth.uid()::text);

-- Function to update report credibility score
create or replace function public.update_report_credibility(report_id_param bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  confirm_count integer;
  deny_count integer;
  total_validations integer;
  user_rep_bonus decimal(3,2) := 0;
  time_penalty decimal(3,2) := 0;
  final_score decimal(3,2);
  reporter_rep integer;
  hours_old decimal(8,2);
begin
  -- Get validation counts
  select
    count(case when validation_type = 'confirm' then 1 end),
    count(case when validation_type = 'deny' then 1 end),
    count(*)
  into confirm_count, deny_count, total_validations
  from report_validations
  where report_id = report_id_param;

  -- Get reporter reputation (clamp to reasonable range)
  select coalesce(greatest(-100, least(1000, reputation)), 0) into reporter_rep
  from users u
  join reports r on r.user_id = u.user_id
  where r.id = report_id_param;

  -- Calculate user reputation bonus (-0.2 to +0.2)
  user_rep_bonus := (reporter_rep::decimal / 100) * 0.2;
  user_rep_bonus := greatest(-0.2, least(0.2, user_rep_bonus));

  -- Calculate time penalty (0.01 per hour, max 0.2)
  select extract(epoch from (now() - created_at)) / 3600 into hours_old
  from reports where id = report_id_param;

  time_penalty := least(hours_old * 0.01, 0.2);

  -- Calculate final credibility score
  if total_validations > 0 then
    -- Community validation bonus (-0.3 to +0.3)
    final_score := 0.5 +
                   user_rep_bonus +
                   ((confirm_count::decimal / total_validations) - 0.5) * 0.6 -
                   time_penalty;
  else
    -- No validations yet
    final_score := 0.5 + user_rep_bonus - time_penalty;
  end if;

  -- Clamp score between 0.1 and 0.9
  final_score := greatest(0.1, least(0.9, final_score));

  -- Update report
  update reports
  set
    credibility_score = final_score,
    validation_count = total_validations,
    last_validated_at = now()
  where id = report_id_param;

end;
$$;

-- Trigger to automatically update credibility when validations change
create or replace function public.trigger_update_credibility()
returns trigger
language plpgsql
as $$
begin
  -- Update credibility for the affected report
  perform update_report_credibility(
    case
      when TG_OP = 'DELETE' then OLD.report_id
      else NEW.report_id
    end
  );

  return case
    when TG_OP = 'DELETE' then OLD
    else NEW
  end;
end;
$$;

-- Create triggers
drop trigger if exists report_validations_insert_trigger on public.report_validations;
create trigger report_validations_insert_trigger
  after insert on public.report_validations
  for each row execute function public.trigger_update_credibility();

drop trigger if exists report_validations_update_trigger on public.report_validations;
create trigger report_validations_update_trigger
  after update on public.report_validations
  for each row execute function public.trigger_update_credibility();

drop trigger if exists report_validations_delete_trigger on public.report_validations;
create trigger report_validations_delete_trigger
  after delete on public.report_validations
  for each row execute function public.trigger_update_credibility();

-- Marketing Email System
-- Add marketing consent and preferences to users table
alter table public.users add column if not exists marketing_consent boolean default false;
alter table public.users add column if not exists marketing_preferences jsonb default '{
  "product_updates": true,
  "community_news": true,
  "safety_alerts": true,
  "weekly_digest": false,
  "language": "en"
}';
alter table public.users add column if not exists unsubscribed_at timestamptz;
alter table public.users add column if not exists last_email_sent_at timestamptz;

-- Email campaigns table
create table if not exists public.email_campaigns (
  id bigint generated always as identity primary key,
  name text not null,
  subject text not null,
  content_html text not null,
  content_text text,
  status text default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer default 0,
  open_count integer default 0,
  click_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email campaign recipients
create table if not exists public.email_recipients (
  id bigint generated always as identity primary key,
  campaign_id bigint references public.email_campaigns(id) on delete cascade,
  user_id text references public.users(user_id) on delete cascade,
  email text not null,
  status text default 'pending' check (status in ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz default now(),
  unique (campaign_id, user_id)
);

-- Magic link authentication tokens
create table if not exists public.auth_tokens (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  email text not null,
  token text not null unique,
  token_type text default 'magic_link' check (token_type in ('magic_link', 'password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, token_type)
);

-- Indexes for performance
create index if not exists email_campaigns_status_idx on public.email_campaigns(status);
create index if not exists email_campaigns_scheduled_at_idx on public.email_campaigns(scheduled_at);
create index if not exists email_recipients_campaign_id_idx on public.email_recipients(campaign_id);
create index if not exists email_recipients_user_id_idx on public.email_recipients(user_id);
create index if not exists email_recipients_status_idx on public.email_recipients(status);

-- Row Level Security
alter table public.email_campaigns enable row level security;
alter table public.email_recipients enable row level security;

-- Allow authenticated admin users to manage campaigns
drop policy if exists email_campaigns_admin_all on public.email_campaigns;
create policy email_campaigns_admin_all on public.email_campaigns
  for all to authenticated
  using (auth.jwt() ->> 'role' = 'admin' or auth.uid() = created_by);

-- Allow authenticated users to read their own recipient records
drop policy if exists email_recipients_user_read on public.email_recipients;
create policy email_recipients_user_read on public.email_recipients
  for select to authenticated
  using (user_id::text = auth.uid()::text);

-- Function to get verified users for marketing
create or replace function public.get_marketing_recipients(
  p_preferences jsonb default null,
  p_language text default null,
  p_limit integer default 1000
)
returns table (
  user_id text,
  email text,
  first_name text,
  last_name text,
  language text,
  preferences jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    coalesce(u.language, 'en') as language,
    u.marketing_preferences
  from users u
  where u.email_confirmed_at is not null
    and u.marketing_consent = true
    and u.unsubscribed_at is null
    and (p_preferences is null or u.marketing_preferences @> p_preferences)
    and (p_language is null or u.language = p_language)
  order by u.created_at desc
  limit p_limit;
end;
$$;
