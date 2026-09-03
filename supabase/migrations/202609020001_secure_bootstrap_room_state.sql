-- Compact, public live-state bootstrap. Do not serialize table rows here: rooms,
-- teams, and rounds contain host or quiz-authoring fields that are not client data.
create or replace function public.bootstrap_room_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_round_id uuid;
  v_active_question_index integer;
  v_is_host boolean;
begin
  if not exists (select 1 from public.rooms where id = p_room_id) then
    raise exception 'Room not found.';
  end if;

  v_is_host := public.is_room_host(p_room_id);

  select r.id into v_active_round_id
  from public.rounds r
  where r.room_id = p_room_id
  order by r.created_at desc
  limit 1;

  select current_question_index into v_active_question_index
  from public.rounds
  where id = v_active_round_id;

  return jsonb_build_object(
    'room', (
      select jsonb_build_object(
        'id', r.id, 'code', r.code, 'status', r.status,
        'planned_round_queue', r.planned_round_queue, 'created_at', r.created_at
      ) from public.rooms r where r.id = p_room_id
    ),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'room_id', t.room_id, 'name', t.name, 'score', t.score,
        'joined_at', t.joined_at, 'animal', t.animal, 'avatar_emoji', t.avatar_emoji,
        'avatar_image', t.avatar_image, 'color', t.color, 
        'leader_code', case when v_is_host then t.leader_code else null end
      ) order by t.name)
      from public.teams t where t.room_id = p_room_id
    ), '[]'::jsonb),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'room_id', r.room_id, 'round_number', r.round_number,
        'round_type', r.round_type, 'title', r.title, 'prompt', r.prompt,
        'question', r.question, 'challenge', r.challenge, 'scoring_guide', r.scoring_guide,
        'instructions', r.instructions, 'twist', r.twist, 'status', r.status,
        'target_team_id', r.target_team_id, 'rival_team_id', r.rival_team_id,
        'challenge_config', r.challenge_config, 'challenge_winner_team_id', r.challenge_winner_team_id,
        'challenge_resolved_at', r.challenge_resolved_at, 'is_final', r.is_final,
        'timer_seconds', r.timer_seconds, 'answer_options', r.answer_options,
        'correct_answer', null, 'question_set', r.question_set,
        'current_question_index', r.current_question_index, 'question_status', r.question_status,
        'question_started_at', r.question_started_at, 'started_at', r.started_at, 'created_at', r.created_at
      ) order by r.created_at desc)
      from (
        select * from public.rounds where room_id = p_room_id order by created_at desc limit 20
      ) r
    ), '[]'::jsonb),
    'activeRound', (
      select jsonb_build_object(
        'id', r.id, 'room_id', r.room_id, 'round_number', r.round_number,
        'round_type', r.round_type, 'title', r.title, 'prompt', r.prompt,
        'question', r.question, 'challenge', r.challenge, 'scoring_guide', r.scoring_guide,
        'instructions', r.instructions, 'twist', r.twist, 'status', r.status,
        'target_team_id', r.target_team_id, 'rival_team_id', r.rival_team_id,
        'challenge_config', r.challenge_config, 'challenge_winner_team_id', r.challenge_winner_team_id,
        'challenge_resolved_at', r.challenge_resolved_at, 'is_final', r.is_final,
        'timer_seconds', r.timer_seconds, 'answer_options', r.answer_options,
        'correct_answer', null, 'question_set', r.question_set,
        'current_question_index', r.current_question_index, 'question_status', r.question_status,
        'question_started_at', r.question_started_at, 'started_at', r.started_at, 'created_at', r.created_at
      ) from public.rounds r where r.id = v_active_round_id
    ),
    'votes', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'round_id', v.round_id, 'voter_team_id', v.voter_team_id, 'target_team_id', v.target_team_id))
      from public.votes v where v.round_id = v_active_round_id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'round_id', a.round_id, 'team_id', a.team_id,
        'question_index', a.question_index, 'answer', a.answer,
        'is_correct', a.is_correct, 'submitted_at', a.submitted_at
      ) order by a.submitted_at, a.id)
      from public.answer_submissions a
      where a.round_id = v_active_round_id
        and (v_active_question_index is null or a.question_index = v_active_question_index)
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.bootstrap_room_state(uuid) to anon, authenticated;
