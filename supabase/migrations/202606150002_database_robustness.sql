alter table public.score_events
  add column if not exists dedupe_key text;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'rooms'
  ) then
    create unique index if not exists rooms_code_unique_idx
      on public.rooms(code);
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'teams'
  ) then
    create unique index if not exists teams_room_leader_code_unique_idx
      on public.teams(room_id, leader_code);

    create index if not exists teams_room_score_idx
      on public.teams(room_id, score desc);
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'votes'
  ) then
    create index if not exists votes_target_team_idx
      on public.votes(target_team_id);
  end if;
end $$;

create unique index if not exists score_events_room_dedupe_unique_idx
  on public.score_events(room_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists score_events_round_created_idx
  on public.score_events(round_id, created_at desc);

create index if not exists answer_submissions_team_submitted_idx
  on public.answer_submissions(team_id, submitted_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'votes_no_self_vote_check'
  ) then
    alter table public.votes
      add constraint votes_no_self_vote_check
      check (voter_team_id <> target_team_id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'answer_submissions_question_index_check'
  ) then
    alter table public.answer_submissions
      add constraint answer_submissions_question_index_check
      check (question_index >= 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'answer_submissions_answer_not_blank_check'
  ) then
    alter table public.answer_submissions
      add constraint answer_submissions_answer_not_blank_check
      check (char_length(btrim(answer)) > 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'score_events_delta_nonzero_check'
  ) then
    alter table public.score_events
      add constraint score_events_delta_nonzero_check
      check (delta <> 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'score_events_reason_not_blank_check'
  ) then
    alter table public.score_events
      add constraint score_events_reason_not_blank_check
      check (char_length(btrim(reason)) > 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rounds_current_question_index_check'
  ) then
    alter table public.rounds
      add constraint rounds_current_question_index_check
      check (current_question_index >= 0)
      not valid;
  end if;
end $$;

create or replace function public.validate_vote_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  round_room_id uuid;
  round_status text;
  voter_room_id uuid;
  target_room_id uuid;
begin
  if new.voter_team_id = new.target_team_id then
    raise exception 'Teams cannot vote for themselves.';
  end if;

  select room_id, status
  into round_room_id, round_status
  from public.rounds
  where id = new.round_id;

  if round_room_id is null then
    raise exception 'Vote round does not exist.';
  end if;

  if round_status <> 'voting' then
    raise exception 'Votes are closed for this round.';
  end if;

  select room_id into voter_room_id
  from public.teams
  where id = new.voter_team_id;

  select room_id into target_room_id
  from public.teams
  where id = new.target_team_id;

  if voter_room_id is null or target_room_id is null then
    raise exception 'Vote team does not exist.';
  end if;

  if voter_room_id <> round_room_id or target_room_id <> round_room_id then
    raise exception 'Vote teams must belong to the same room as the round.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_vote_integrity_trigger on public.votes;
create trigger validate_vote_integrity_trigger
  before insert or update on public.votes
  for each row
  execute function public.validate_vote_integrity();

create or replace function public.validate_answer_submission_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  round_room_id uuid;
  team_room_id uuid;
  question_count integer;
  quiz_status text;
  active_question_index integer;
begin
  if new.question_index < 0 then
    raise exception 'Question index must be zero or greater.';
  end if;

  if char_length(btrim(new.answer)) = 0 then
    raise exception 'Answer cannot be blank.';
  end if;

  select room_id,
         case
           when question_set is null then null
           else jsonb_array_length(question_set)
         end,
         question_status,
         current_question_index
  into round_room_id, question_count, quiz_status, active_question_index
  from public.rounds
  where id = new.round_id;

  if round_room_id is null then
    raise exception 'Answer round does not exist.';
  end if;

  select room_id into team_room_id
  from public.teams
  where id = new.team_id;

  if team_room_id is null then
    raise exception 'Answer team does not exist.';
  end if;

  if team_room_id <> round_room_id then
    raise exception 'Answer team must belong to the same room as the round.';
  end if;

  if question_count is not null and question_count > 0 then
    if new.question_index >= question_count then
      raise exception 'Question index is outside the quiz question set.';
    end if;

    if quiz_status <> 'live' then
      raise exception 'This quiz question is not live.';
    end if;

    if new.question_index <> active_question_index then
      raise exception 'This question is not the active question.';
    end if;

    if tg_op = 'UPDATE' then
      raise exception 'Quiz answers cannot be changed after submission.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_answer_submission_integrity_trigger on public.answer_submissions;
create trigger validate_answer_submission_integrity_trigger
  before insert or update on public.answer_submissions
  for each row
  execute function public.validate_answer_submission_integrity();

create or replace function public.apply_score_event(
  p_room_id uuid,
  p_team_id uuid,
  p_delta integer,
  p_reason text default 'Manual score',
  p_round_id uuid default null,
  p_dedupe_key text default null
)
returns table (
  id uuid,
  room_id uuid,
  round_id uuid,
  team_id uuid,
  delta integer,
  reason text,
  created_at timestamptz,
  undone_at timestamptz,
  dedupe_key text,
  new_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_event public.score_events%rowtype;
  inserted_event public.score_events%rowtype;
  updated_score integer;
begin
  if p_delta = 0 then
    raise exception 'Score delta cannot be zero.';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Score reason cannot be blank.';
  end if;

  if p_dedupe_key is not null then
    perform pg_advisory_xact_lock(hashtext(p_room_id::text || ':' || p_dedupe_key));

    select *
    into existing_event
    from public.score_events
    where score_events.room_id = p_room_id
      and score_events.dedupe_key = p_dedupe_key
      and score_events.undone_at is null
    limit 1;

    if found then
      select score into updated_score
      from public.teams
      where teams.id = existing_event.team_id;

      return query
      select
        existing_event.id,
        existing_event.room_id,
        existing_event.round_id,
        existing_event.team_id,
        existing_event.delta,
        existing_event.reason,
        existing_event.created_at,
        existing_event.undone_at,
        existing_event.dedupe_key,
        updated_score;
      return;
    end if;
  end if;

  if p_round_id is not null and not exists (
    select 1 from public.rounds
    where rounds.id = p_round_id
      and rounds.room_id = p_room_id
  ) then
    raise exception 'Score round must belong to the room.';
  end if;

  update public.teams
  set score = coalesce(score, 0) + p_delta
  where teams.id = p_team_id
    and teams.room_id = p_room_id
  returning score into updated_score;

  if updated_score is null then
    raise exception 'Score team must belong to the room.';
  end if;

  insert into public.score_events (
    room_id,
    round_id,
    team_id,
    delta,
    reason,
    dedupe_key
  )
  values (
    p_room_id,
    p_round_id,
    p_team_id,
    p_delta,
    btrim(p_reason),
    p_dedupe_key
  )
  returning * into inserted_event;

  return query
  select
    inserted_event.id,
    inserted_event.room_id,
    inserted_event.round_id,
    inserted_event.team_id,
    inserted_event.delta,
    inserted_event.reason,
    inserted_event.created_at,
    inserted_event.undone_at,
    inserted_event.dedupe_key,
    updated_score;
end;
$$;

create or replace function public.undo_score_event(
  p_score_event_id uuid
)
returns table (
  id uuid,
  room_id uuid,
  round_id uuid,
  team_id uuid,
  delta integer,
  reason text,
  created_at timestamptz,
  undone_at timestamptz,
  dedupe_key text,
  new_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_event public.score_events%rowtype;
  updated_event public.score_events%rowtype;
  updated_score integer;
begin
  select *
  into locked_event
  from public.score_events
  where score_events.id = p_score_event_id
  for update;

  if locked_event.id is null then
    raise exception 'Score event does not exist.';
  end if;

  if locked_event.undone_at is not null then
    select score into updated_score
    from public.teams
    where teams.id = locked_event.team_id;

    return query
    select
      locked_event.id,
      locked_event.room_id,
      locked_event.round_id,
      locked_event.team_id,
      locked_event.delta,
      locked_event.reason,
      locked_event.created_at,
      locked_event.undone_at,
      locked_event.dedupe_key,
      updated_score;
    return;
  end if;

  update public.teams
  set score = coalesce(score, 0) - locked_event.delta
  where teams.id = locked_event.team_id
    and teams.room_id = locked_event.room_id
  returning score into updated_score;

  if updated_score is null then
    raise exception 'Score team must belong to the score event room.';
  end if;

  update public.score_events
  set undone_at = now()
  where score_events.id = locked_event.id
  returning * into updated_event;

  return query
  select
    updated_event.id,
    updated_event.room_id,
    updated_event.round_id,
    updated_event.team_id,
    updated_event.delta,
    updated_event.reason,
    updated_event.created_at,
    updated_event.undone_at,
    updated_event.dedupe_key,
    updated_score;
end;
$$;

grant execute on function public.apply_score_event(uuid, uuid, integer, text, uuid, text)
  to anon, authenticated;

grant execute on function public.undo_score_event(uuid)
  to anon, authenticated;
