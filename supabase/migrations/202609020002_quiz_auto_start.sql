-- Idempotent, host-authorized question transitions. The frontend may retry these
-- after reconnecting, but only the expected persisted state can advance.
create or replace function public.host_start_quiz_question(
  p_round_id uuid,
  p_question_index integer
)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
begin
  select * into v_round from public.rounds where id = p_round_id for update;
  if not found then raise exception 'Round not found.'; end if;
  if not public.is_room_host(v_round.room_id) then raise exception 'Host authorization required.'; end if;
  if v_round.current_question_index <> p_question_index then raise exception 'Question is no longer current.'; end if;

  if v_round.question_status = 'live' then return v_round; end if;
  if v_round.question_status <> 'waiting' or v_round.status <> 'live' then
    raise exception 'Question cannot be started from its current state.';
  end if;

  update public.rounds
  set question_status = 'live', question_started_at = now(), correct_answer = null
  where id = p_round_id
  returning * into v_round;
  return v_round;
end;
$$;

create or replace function public.host_advance_quiz_question(p_round_id uuid)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
  v_next_index integer;
begin
  select * into v_round from public.rounds where id = p_round_id for update;
  if not found then raise exception 'Round not found.'; end if;
  if not public.is_room_host(v_round.room_id) then raise exception 'Host authorization required.'; end if;
  if v_round.question_status <> 'scored' then raise exception 'Score the current question first.'; end if;
  if v_round.question_set is null then raise exception 'Round has no question set.'; end if;

  v_next_index := coalesce(v_round.current_question_index, 0) + 1;
  if v_next_index >= jsonb_array_length(v_round.question_set) then
    raise exception 'No next question remains.';
  end if;

  update public.rounds
  set current_question_index = v_next_index,
      question_status = 'live',
      question_started_at = now(),
      correct_answer = null
  where id = p_round_id
  returning * into v_round;
  return v_round;
end;
$$;

grant execute on function public.host_start_quiz_question(uuid, integer) to anon, authenticated;
grant execute on function public.host_advance_quiz_question(uuid) to anon, authenticated;
