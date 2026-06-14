alter table public.rounds
  add column if not exists question_set jsonb,
  add column if not exists current_question_index integer not null default 0,
  add column if not exists question_status text not null default 'waiting',
  add column if not exists question_started_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rounds_question_status_check'
  ) then
    alter table public.rounds
      add constraint rounds_question_status_check
      check (question_status in ('waiting', 'live', 'locked', 'complete'));
  end if;
end $$;

alter table public.answer_submissions
  add column if not exists question_index integer not null default 0;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'answer_submissions'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by ord.ordinality)
        from unnest(con.conkey) with ordinality as ord(attnum, ordinality)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ord.attnum
      ) = array['round_id', 'team_id']
  loop
    execute format('alter table public.answer_submissions drop constraint %I', constraint_name);
  end loop;
end $$;

create index if not exists teams_room_idx
  on public.teams(room_id);

create index if not exists rounds_room_created_idx
  on public.rounds(room_id, created_at desc);

create index if not exists votes_round_idx
  on public.votes(round_id);

create unique index if not exists votes_round_voter_unique_idx
  on public.votes(round_id, voter_team_id);

create index if not exists answer_submissions_round_idx
  on public.answer_submissions(round_id);

create index if not exists answer_submissions_round_team_idx
  on public.answer_submissions(round_id, team_id);

create unique index if not exists answer_submissions_round_team_question_unique_idx
  on public.answer_submissions(round_id, team_id, question_index);

create index if not exists score_events_room_created_idx
  on public.score_events(room_id, created_at desc);
