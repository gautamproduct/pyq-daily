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
  created_at timestamptz not null default now()
);

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
