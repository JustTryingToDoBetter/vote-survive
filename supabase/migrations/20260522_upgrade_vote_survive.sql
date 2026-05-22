alter table public.teams
  add column if not exists animal text,
  add column if not exists avatar_emoji text,
  add column if not exists avatar_image text,
  add column if not exists color text,
  add column if not exists joined_at timestamptz;

alter table public.rounds
  add column if not exists round_number integer,
  add column if not exists round_type text default 'voting',
  add column if not exists title text,
  add column if not exists prompt text,
  add column if not exists scoring_guide text,
  add column if not exists instructions text,
  add column if not exists twist text,
  add column if not exists is_final boolean default false,
  add column if not exists timer_seconds integer,
  add column if not exists answer_options jsonb,
  add column if not exists correct_answer text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rounds_round_type_check'
  ) then
    alter table public.rounds
      add constraint rounds_round_type_check
      check (round_type in (
        'voting',
        'all_play',
        'quiz_burst',
        'bible_speed',
        'dance_battle',
        'steal',
        'final_double'
      ));
  end if;
end $$;

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  delta integer not null,
  reason text not null default 'Manual score',
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index if not exists score_events_room_created_idx
  on public.score_events(room_id, created_at desc);

create index if not exists score_events_team_created_idx
  on public.score_events(team_id, created_at desc);

create table if not exists public.answer_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique(round_id, team_id)
);

create index if not exists answer_submissions_round_submitted_idx
  on public.answer_submissions(round_id, submitted_at asc);
