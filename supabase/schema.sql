-- PYQ Daily — schema
-- Run this in the Supabase SQL editor (Database > SQL Editor > New query)

create extension if not exists pgcrypto;

-- One row per participant. Identified by a random device_id stored in
-- localStorage (no login/OTP), plus the name they typed.
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text not null,
  class text not null check (class in ('11', '12', 'dropper')),
  exam text not null check (exam in ('JEE', 'NEET')),
  created_at timestamptz not null default now()
);

-- Question bank. Populated via scripts/import-questions.js from an Excel file.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam text not null check (exam in ('JEE', 'NEET')),
  class text not null check (class in ('11', '12', 'dropper')),
  subject text,
  chapter text,
  year int,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  solution text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);
alter table questions add column if not exists difficulty text check (difficulty in ('easy', 'medium', 'hard'));

-- Which 3 questions are "today's" for a given class+exam group.
create table if not exists daily_sets (
  id uuid primary key default gen_random_uuid(),
  set_date date not null,
  class text not null check (class in ('11', '12', 'dropper')),
  exam text not null check (exam in ('JEE', 'NEET')),
  question_ids uuid[] not null,
  unique (set_date, class, exam)
);

-- One row per (player, question, day). Records the answer + correctness.
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  class text not null check (class in ('11', '12', 'dropper')),
  exam text not null check (exam in ('JEE', 'NEET')),
  set_date date not null,
  selected_option text check (selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  time_taken_ms int,
  created_at timestamptz not null default now(),
  unique (player_id, question_id, set_date)
);

-- Streak state per player, updated on each completed day.
create table if not exists streaks (
  player_id uuid primary key references players(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_played_date date
);

-- Lightweight analytics events (onboarding, quiz_completed, leaderboard_view, etc).
create table if not exists events (
  id bigint generated always as identity primary key,
  player_id uuid references players(id) on delete set null,
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_group on questions (exam, class);
create index if not exists idx_attempts_player on attempts (player_id);
create index if not exists idx_attempts_set_date on attempts (set_date);
create index if not exists idx_events_name on events (event_name);

-- RLS: all writes/reads go through Next.js API routes using the service-role
-- key (server-side only), so the anon key is never used directly by the
-- client. Enable RLS with no policies to lock the tables down from anon/public.
alter table players enable row level security;
alter table questions enable row level security;
alter table daily_sets enable row level security;
alter table attempts enable row level security;
alter table streaks enable row level security;
alter table events enable row level security;

-- ============================================================
-- Analytics views — read these directly in the Supabase Table
-- Editor (Database > Table Editor > Views) to judge how the
-- experiment is actually going.
-- ============================================================

-- One row per player: who they are, how much they've engaged, whether
-- they're still active or have dropped off, and whether they've looked at
-- the leaderboard / shared their score.
-- Pre-aggregate attempts and events into one row per player BEFORE joining
-- them to the player list. Joining both multi-row tables directly on
-- player_id (with no relationship between an attempt and an event) produces
-- a cross-join fan-out per player — e.g. 3 attempts x 6 events = 18 joined
-- rows, silently multiplying every count() in the old version of this view.
create or replace view player_analytics as
select
  p.id as player_id,
  p.device_id,
  p.name,
  p.class,
  p.exam as goal_exam,
  p.created_at as registered_at,
  coalesce(att.days_played, 0) as days_played,
  coalesce(att.questions_attempted, 0) as questions_attempted,
  coalesce(att.questions_correct, 0) as questions_correct,
  round(
    100.0 * coalesce(att.questions_correct, 0) / nullif(coalesce(att.questions_attempted, 0), 0),
    1
  ) as accuracy_pct,
  att.first_active_date,
  att.last_active_date,
  (current_date - att.last_active_date) as days_since_last_active,
  case
    when att.last_active_date is null then 'never_played'
    when att.last_active_date >= current_date - 1 then 'active'
    else 'dropped_off'
  end as status,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(s.longest_streak, 0) as longest_streak,
  coalesce(att.chapters_covered, 0) as chapters_covered,
  coalesce(ev.leaderboard_views, 0) as leaderboard_views,
  coalesce(ev.solutions_views, 0) as solutions_views,
  coalesce(ev.chapters_tab_views, 0) as chapters_tab_views,
  coalesce(ev.share_clicks, 0) as share_clicks
from players p
left join (
  select
    a.player_id,
    count(distinct a.set_date) as days_played,
    count(a.id) as questions_attempted,
    count(a.id) filter (where a.is_correct) as questions_correct,
    min(a.set_date) as first_active_date,
    max(a.set_date) as last_active_date,
    count(distinct q.chapter) filter (where q.chapter is not null) as chapters_covered
  from attempts a
  left join questions q on q.id = a.question_id
  group by a.player_id
) att on att.player_id = p.id
left join streaks s on s.player_id = p.id
left join (
  select
    player_id,
    count(*) filter (where event_name like 'tab_viewed_leaderboard%') as leaderboard_views,
    count(*) filter (where event_name like 'tab_viewed_solutions%') as solutions_views,
    count(*) filter (where event_name like 'tab_viewed_chapters%') as chapters_tab_views,
    count(*) filter (where event_name = 'share_clicked') as share_clicks
  from events
  where player_id is not null
  group by player_id
) ev on ev.player_id = p.id
order by att.questions_attempted desc nulls last, att.days_played desc nulls last;

-- One row per (player, day): did they show up that specific day, how many
-- of the 3 questions did they answer, how many correct. Pivot this to see
-- exactly who came daily vs. who skipped days.
create or replace view player_daily_activity as
select
  a.player_id,
  p.name,
  p.class,
  p.exam as goal_exam,
  a.set_date,
  count(a.id) as questions_answered,
  count(a.id) filter (where a.is_correct) as questions_correct
from attempts a
join players p on p.id = a.player_id
group by a.player_id, p.name, p.class, p.exam, a.set_date
order by a.set_date, p.name;

-- Funnel-style event counts (page views, registrations, quiz starts/
-- completions, tab views, shares) per day — useful for a quick top-of-funnel
-- read on whether people who land on the site actually convert to playing.
create or replace view daily_event_summary as
select
  date(created_at) as day,
  event_name,
  count(*) as event_count,
  count(distinct player_id) as distinct_players
from events
group by date(created_at), event_name
order by day desc, event_count desc;
