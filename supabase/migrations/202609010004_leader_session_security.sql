create extension if not exists pgcrypto;

create table if not exists public.leader_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists leader_sessions_team_active_idx
  on public.leader_sessions(team_id, expires_at desc)
  where revoked_at is null;

alter table public.leader_sessions enable row level security;
revoke all on public.leader_sessions from public, anon, authenticated;

revoke execute on function public.join_team_session(uuid, uuid, text)
  from public, anon, authenticated;
drop function if exists public.join_team_session(uuid, uuid, text);

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
  from public.rooms r
  join public.teams t on t.room_id = r.id
  where upper(r.code) = upper(btrim(p_room_code))
    and upper(t.leader_code) = upper(btrim(p_leader_code))
  limit 1;

  if v_room_id is null or v_team_id is null then
    raise exception 'Invalid room or leader code.';
  end if;

  update public.leader_sessions
  set revoked_at = now()
  where team_id = v_team_id
    and revoked_at is null
    and expires_at > now();

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

  update public.teams
  set joined_at = v_joined_at
  where id = v_team_id;

  return query
  select v_room_id, v_team_id, v_token, v_joined_at, v_expires_at;
end;
$$;

create or replace function public.restore_team_session(
  p_session_token text
)
returns table (
  room_id uuid,
  team_id uuid,
  joined_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_hash text;
begin
  if char_length(btrim(coalesce(p_session_token, ''))) < 32 then
    raise exception 'Leader session is invalid or expired.';
  end if;

  v_token_hash := encode(digest(btrim(p_session_token), 'sha256'), 'hex');

  update public.leader_sessions s
  set last_seen_at = now()
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now();

  if not found then
    raise exception 'Leader session is invalid or expired.';
  end if;

  return query
  select s.room_id, s.team_id, t.joined_at, s.expires_at
  from public.leader_sessions s
  join public.teams t on t.id = s.team_id
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;
end;
$$;

create or replace function public.host_list_teams(
  p_room_id uuid
)
returns table (
  id uuid,
  room_id uuid,
  name text,
  leader_code text,
  score integer,
  joined_at timestamptz,
  animal text,
  avatar_emoji text,
  avatar_image text,
  color text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_host(p_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  return query
  select
    t.id,
    t.room_id,
    t.name,
    t.leader_code,
    t.score,
    t.joined_at,
    t.animal,
    t.avatar_emoji,
    t.avatar_image,
    t.color
  from public.teams t
  where t.room_id = p_room_id
  order by t.name asc;
end;
$$;

create or replace function public.submit_team_vote(
  p_session_token text,
  p_round_id uuid,
  p_target_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_hash text;
  v_session_room_id uuid;
  v_voter_team_id uuid;
  v_round_room_id uuid;
  v_round_status text;
  v_round_type text;
  v_target_room_id uuid;
begin
  if char_length(btrim(coalesce(p_session_token, ''))) < 32 then
    raise exception 'Leader session is invalid or expired.';
  end if;

  v_token_hash := encode(digest(btrim(p_session_token), 'sha256'), 'hex');

  select s.room_id, s.team_id
  into v_session_room_id, v_voter_team_id
  from public.leader_sessions s
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;

  if v_session_room_id is null or v_voter_team_id is null then
    raise exception 'Leader session is invalid or expired.';
  end if;

  select r.room_id, r.status, r.round_type
  into v_round_room_id, v_round_status, v_round_type
  from public.rounds r
  where r.id = p_round_id;

  if v_round_room_id is null then
    raise exception 'Vote round does not exist.';
  end if;

  if v_round_room_id <> v_session_room_id then
    raise exception 'Leader session does not belong to this room.';
  end if;

  if v_round_status <> 'voting'
     or v_round_type not in ('voting', 'steal') then
    raise exception 'Voting is not open for this round.';
  end if;

  select t.room_id
  into v_target_room_id
  from public.teams t
  where t.id = p_target_team_id;

  if v_target_room_id is null or v_target_room_id <> v_session_room_id then
    raise exception 'Vote target must belong to this room.';
  end if;

  if p_target_team_id = v_voter_team_id then
    raise exception 'Teams cannot vote for themselves.';
  end if;

  insert into public.votes (
    round_id,
    voter_team_id,
    target_team_id
  )
  values (
    p_round_id,
    v_voter_team_id,
    p_target_team_id
  )
  on conflict (round_id, voter_team_id)
  do update set target_team_id = excluded.target_team_id;

  update public.leader_sessions
  set last_seen_at = now()
  where token_hash = v_token_hash;
end;
$$;

create or replace function public.submit_team_answer(
  p_session_token text,
  p_round_id uuid,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_hash text;
  v_session_room_id uuid;
  v_team_id uuid;
  v_round_room_id uuid;
  v_round_status text;
  v_question_index integer;
  v_question_set jsonb;
  v_correct_answer text;
  v_is_correct boolean := false;
begin
  if char_length(btrim(coalesce(p_session_token, ''))) < 32 then
    raise exception 'Leader session is invalid or expired.';
  end if;

  if char_length(btrim(coalesce(p_answer, ''))) = 0 then
    raise exception 'Answer cannot be blank.';
  end if;

  v_token_hash := encode(digest(btrim(p_session_token), 'sha256'), 'hex');

  select s.room_id, s.team_id
  into v_session_room_id, v_team_id
  from public.leader_sessions s
  where s.token_hash = v_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;

  if v_session_room_id is null or v_team_id is null then
    raise exception 'Leader session is invalid or expired.';
  end if;

  select
    r.room_id,
    r.status,
    coalesce(r.current_question_index, 0),
    r.question_set,
    r.correct_answer
  into
    v_round_room_id,
    v_round_status,
    v_question_index,
    v_question_set,
    v_correct_answer
  from public.rounds r
  where r.id = p_round_id;

  if v_round_room_id is null then
    raise exception 'Answer round does not exist.';
  end if;

  if v_round_room_id <> v_session_room_id then
    raise exception 'Leader session does not belong to this room.';
  end if;

  if v_round_status <> 'live' then
    raise exception 'Answers are closed for this round.';
  end if;

  if exists (
    select 1
    from public.answer_submissions a
    where a.round_id = p_round_id
      and a.team_id = v_team_id
      and a.question_index = v_question_index
  ) then
    raise exception 'Answer already submitted for this question.';
  end if;

  if v_question_set is null then
    v_is_correct := p_answer = v_correct_answer;
  end if;

  insert into public.answer_submissions (
    round_id,
    team_id,
    question_index,
    answer,
    is_correct,
    submitted_at
  )
  values (
    p_round_id,
    v_team_id,
    v_question_index,
    btrim(p_answer),
    v_is_correct,
    now()
  );

  update public.leader_sessions
  set last_seen_at = now()
  where token_hash = v_token_hash;
end;
$$;

drop policy if exists votes_submit on public.votes;
drop policy if exists votes_change_while_live on public.votes;
drop policy if exists answers_submit on public.answer_submissions;
drop policy if exists answers_change on public.answer_submissions;

revoke insert, update on public.votes from anon, authenticated;
revoke insert, update on public.answer_submissions from anon, authenticated;

revoke select on public.teams from anon, authenticated;
grant select (
  id,
  room_id,
  name,
  score,
  joined_at,
  animal,
  avatar_emoji,
  avatar_image,
  color
) on public.teams to anon, authenticated;

grant execute on function public.join_team_session(text, text)
  to anon, authenticated;
grant execute on function public.restore_team_session(text)
  to anon, authenticated;
grant execute on function public.submit_team_vote(text, uuid, uuid)
  to anon, authenticated;
grant execute on function public.submit_team_answer(text, uuid, text)
  to anon, authenticated;
grant execute on function public.host_list_teams(uuid)
  to anon, authenticated;
