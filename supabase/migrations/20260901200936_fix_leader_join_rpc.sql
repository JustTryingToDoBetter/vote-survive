create or replace function public.join_team_session(
  p_room_code text,
  p_leader_code text
)
returns table (
  room_id uuid,
  team_id uuid,
  session_token text,
  joined_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_team_id uuid;
  v_token text;
  v_joined_at timestamptz := now();
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  if char_length(btrim(coalesce(p_room_code, ''))) = 0
     or char_length(btrim(coalesce(p_leader_code, ''))) = 0 then
    raise exception 'Invalid room or leader code.';
  end if;

  select r.id, t.id
  into v_room_id, v_team_id
  from public.rooms as r
  join public.teams as t
    on t.room_id = r.id
  where upper(r.code) = upper(btrim(p_room_code))
    and upper(t.leader_code) = upper(btrim(p_leader_code))
  limit 1;

  if v_room_id is null or v_team_id is null then
    raise exception 'Invalid room or leader code.';
  end if;

  -- IMPORTANT:
  -- Qualify team_id with the table alias.
  -- Otherwise it conflicts with the RETURNS TABLE team_id output variable.
  update public.leader_sessions as s
  set revoked_at = now()
  where s.team_id = v_team_id
    and s.revoked_at is null
    and s.expires_at > now();

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.leader_sessions (
    room_id,
    team_id,
    token_hash,
    expires_at,
    last_seen_at
  )
  values (
    v_room_id,
    v_team_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    v_expires_at,
    now()
  );

  update public.teams as t
  set joined_at = v_joined_at
  where t.id = v_team_id;

  return query
  select
    v_room_id,
    v_team_id,
    v_token,
    v_joined_at,
    v_expires_at;
end;
$$;

revoke execute on function public.join_team_session(text, text)
  from public;

grant execute on function public.join_team_session(text, text)
  to anon, authenticated;