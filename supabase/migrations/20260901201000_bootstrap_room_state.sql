create or replace function public.bootstrap_room_state(
  p_room_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room jsonb;
  v_teams jsonb;
  v_rounds jsonb;
  v_active_round jsonb;
  v_active_round_id uuid;
  v_votes jsonb;
  v_answers jsonb;
begin
  select to_jsonb(r)
  into v_room
  from public.rooms r
  where r.id = p_room_id
  limit 1;

  if v_room is null then
    raise exception 'Room not found.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.name asc), '[]'::jsonb)
  into v_teams
  from public.teams t
  where t.room_id = p_room_id;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_rounds
  from public.rounds r
  where r.room_id = p_room_id;

  select to_jsonb(r)
  into v_active_round
  from public.rounds r
  where r.room_id = p_room_id
  order by r.created_at desc
  limit 1;

  if v_active_round is not null then
    v_active_round_id := (v_active_round ->> 'id')::uuid;

    select coalesce(jsonb_agg(to_jsonb(v) order by v.id), '[]'::jsonb)
    into v_votes
    from public.votes v
    where v.round_id = v_active_round_id;

    select coalesce(jsonb_agg(to_jsonb(a) order by a.submitted_at asc, a.id), '[]'::jsonb)
    into v_answers
    from public.answer_submissions a
    where a.round_id = v_active_round_id;
  else
    v_votes := '[]'::jsonb;
    v_answers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'room', v_room,
    'teams', v_teams,
    'rounds', v_rounds,
    'activeRound', v_active_round,
    'votes', v_votes,
    'answers', v_answers
  );
end;
$$;

grant execute on function public.bootstrap_room_state(uuid)
  to anon, authenticated;
