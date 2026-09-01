alter table public.rounds
  drop constraint if exists rounds_question_status_check;

alter table public.rounds
  add constraint rounds_question_status_check
  check (question_status in ('waiting', 'live', 'locked', 'revealed', 'scored', 'complete'))
  not valid;

alter table public.rounds
  validate constraint rounds_question_status_check;

create table if not exists public.quiz_answer_keys (
  round_id uuid not null references public.rounds(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  correct_answer text not null check (char_length(btrim(correct_answer)) > 0),
  primary key (round_id, question_index)
);

alter table public.quiz_answer_keys enable row level security;
revoke all on public.quiz_answer_keys from public, anon, authenticated;

create or replace function public.host_set_quiz_answer_keys(
  p_round_id uuid,
  p_keys jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_inserted integer;
begin
  select room_id
  into v_room_id
  from public.rounds
  where id = p_round_id;

  if v_room_id is null or not public.is_room_host(v_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  if p_keys is null or jsonb_typeof(p_keys) <> 'array' or jsonb_array_length(p_keys) = 0 then
    raise exception 'Quiz answer keys must be a non-empty array.';
  end if;

  delete from public.quiz_answer_keys
  where round_id = p_round_id;

  insert into public.quiz_answer_keys (round_id, question_index, correct_answer)
  select
    p_round_id,
    (item ->> 'questionIndex')::integer,
    btrim(item ->> 'correctAnswer')
  from jsonb_array_elements(p_keys) as item
  where item ? 'questionIndex'
    and item ? 'correctAnswer'
    and char_length(btrim(item ->> 'correctAnswer')) > 0;

  get diagnostics v_inserted = row_count;

  if v_inserted <> jsonb_array_length(p_keys) then
    raise exception 'Every quiz question must include a valid answer key.';
  end if;
end;
$$;

create or replace function public.host_reveal_quiz_answer(
  p_round_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_question_index integer;
  v_question_status text;
  v_correct_answer text;
begin
  select room_id, current_question_index, question_status
  into v_room_id, v_question_index, v_question_status
  from public.rounds
  where id = p_round_id;

  if v_room_id is null or not public.is_room_host(v_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  if v_question_status <> 'locked' then
    raise exception 'Quiz question must be locked before revealing the answer.';
  end if;

  select correct_answer
  into v_correct_answer
  from public.quiz_answer_keys
  where round_id = p_round_id
    and question_index = coalesce(v_question_index, 0);

  if v_correct_answer is null then
    raise exception 'Quiz answer key is missing.';
  end if;

  update public.rounds
  set
    question_status = 'revealed',
    correct_answer = v_correct_answer
  where id = p_round_id;

  return v_correct_answer;
end;
$$;

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
  round_status text;
  active_question_index integer;
  question_started timestamptz;
  question_time_limit integer;
  secure_correct_answer text;
begin
  if new.question_index < 0 then
    raise exception 'Question index must be zero or greater.';
  end if;

  if char_length(btrim(new.answer)) = 0 then
    raise exception 'Answer cannot be blank.';
  end if;

  select
    room_id,
    case
      when question_set is null then null
      else jsonb_array_length(question_set)
    end,
    question_status,
    status,
    current_question_index,
    question_started_at,
    case
      when question_set is null or jsonb_array_length(question_set) = 0 then null
      else nullif(
        question_set -> coalesce(current_question_index, 0) ->> 'timeLimitSeconds',
        ''
      )::integer
    end
  into
    round_room_id,
    question_count,
    quiz_status,
    round_status,
    active_question_index,
    question_started,
    question_time_limit
  from public.rounds
  where id = new.round_id;

  if round_room_id is null then
    raise exception 'Answer round does not exist.';
  end if;

  select room_id
  into team_room_id
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

    if round_status <> 'live' or quiz_status <> 'live' then
      raise exception 'This quiz question is not live.';
    end if;

    if new.question_index <> active_question_index then
      raise exception 'This question is not the active question.';
    end if;

    if question_started is null then
      raise exception 'This quiz question has not started.';
    end if;

    if clock_timestamp() >=
      question_started + make_interval(secs => coalesce(question_time_limit, 15))
    then
      raise exception 'Time has expired for this quiz question.';
    end if;

    select correct_answer
    into secure_correct_answer
    from public.quiz_answer_keys
    where round_id = new.round_id
      and question_index = new.question_index;

    if secure_correct_answer is null then
      raise exception 'Quiz answer key is missing.';
    end if;

    new.is_correct := new.answer = secure_correct_answer;

    if tg_op = 'UPDATE' then
      raise exception 'Quiz answers cannot be changed after submission.';
    end if;
  end if;

  return new;
end;
$$;

grant execute on function public.host_set_quiz_answer_keys(uuid, jsonb)
  to anon, authenticated;
grant execute on function public.host_reveal_quiz_answer(uuid)
  to anon, authenticated;
