alter table public.rounds
  add column if not exists started_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rounds_status_integrity_check'
  ) then
    alter table public.rounds
      add constraint rounds_status_integrity_check
      check (
        status in (
          'lobby',
          'reveal',
          'live',
          'voting',
          'locked',
          'scoring',
          'complete',
          'winner'
        )
      )
      not valid;
  end if;
end $$;

create or replace function public.request_host_pin()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(
    coalesce(
      coalesce(
        nullif(current_setting('request.headers', true), ''),
        '{}'
      )::jsonb ->> 'x-vote-survive-host-pin',
      ''
    ),
    ''
  );
$$;

create or replace function public.is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where rooms.id = p_room_id
      and rooms.host_pin = public.request_host_pin()
  );
$$;

create or replace function public.is_round_host(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rounds
    where rounds.id = p_round_id
      and public.is_room_host(rounds.room_id)
  );
$$;

create or replace function public.join_team_session(
  p_room_id uuid,
  p_team_id uuid,
  p_leader_code text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  joined_time timestamptz := now();
begin
  update public.teams
  set joined_at = joined_time
  where teams.id = p_team_id
    and teams.room_id = p_room_id
    and upper(teams.leader_code) = upper(btrim(p_leader_code));

  if not found then
    raise exception 'Invalid leader session.';
  end if;

  return joined_time;
end;
$$;

create or replace function public.validate_answer_round_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_round_type text;
  parent_round_status text;
begin
  select round_type, status
  into parent_round_type, parent_round_status
  from public.rounds
  where rounds.id = new.round_id;

  if parent_round_type in ('quiz_burst', 'bible_speed')
     and parent_round_status <> 'live' then
    raise exception 'This quiz round is not live.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_answer_round_live_trigger
  on public.answer_submissions;
create trigger validate_answer_round_live_trigger
  before insert or update on public.answer_submissions
  for each row
  execute function public.validate_answer_round_live();

revoke execute on function public.apply_score_event(uuid, uuid, integer, text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.undo_score_event(uuid)
  from public, anon, authenticated;

create or replace function public.host_apply_score_event(
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
begin
  if not public.is_room_host(p_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  return query
  select *
  from public.apply_score_event(
    p_room_id,
    p_team_id,
    p_delta,
    p_reason,
    p_round_id,
    p_dedupe_key
  );
end;
$$;

create or replace function public.host_undo_score_event(
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
  event_room_id uuid;
begin
  select score_events.room_id
  into event_room_id
  from public.score_events
  where score_events.id = p_score_event_id;

  if event_room_id is null or not public.is_room_host(event_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  return query
  select *
  from public.undo_score_event(p_score_event_id);
end;
$$;

create or replace function public.host_transfer_score(
  p_room_id uuid,
  p_from_team_id uuid,
  p_to_team_id uuid,
  p_amount integer,
  p_reason text default 'Score transfer',
  p_round_id uuid default null,
  p_dedupe_key text default null
)
returns table (
  from_score integer,
  to_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_score integer;
  v_to_score integer;
  base_key text;
begin
  if not public.is_room_host(p_room_id) then
    raise exception 'Host authorization failed.';
  end if;

  if p_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero.';
  end if;

  if p_from_team_id = p_to_team_id then
    raise exception 'A team cannot transfer points to itself.';
  end if;

  base_key := coalesce(
    nullif(p_dedupe_key, ''),
    'transfer:' || p_room_id::text || ':' || gen_random_uuid()::text
  );

  perform pg_advisory_xact_lock(hashtext(base_key));

  select result.new_score
  into v_from_score
  from public.apply_score_event(
    p_room_id,
    p_from_team_id,
    -p_amount,
    p_reason || ' debit',
    p_round_id,
    base_key || ':debit'
  ) as result;

  select result.new_score
  into v_to_score
  from public.apply_score_event(
    p_room_id,
    p_to_team_id,
    p_amount,
    p_reason || ' credit',
    p_round_id,
    base_key || ':credit'
  ) as result;

  return query select v_from_score, v_to_score;
end;
$$;

grant execute on function public.join_team_session(uuid, uuid, text)
  to anon, authenticated;
grant execute on function public.host_apply_score_event(uuid, uuid, integer, text, uuid, text)
  to anon, authenticated;
grant execute on function public.host_undo_score_event(uuid)
  to anon, authenticated;
grant execute on function public.host_transfer_score(uuid, uuid, uuid, integer, text, uuid, text)
  to anon, authenticated;

alter table public.rooms enable row level security;
alter table public.teams enable row level security;
alter table public.rounds enable row level security;
alter table public.votes enable row level security;
alter table public.answer_submissions enable row level security;
alter table public.score_events enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'rooms',
        'teams',
        'rounds',
        'votes',
        'answer_submissions',
        'score_events'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end $$;

create policy rooms_read
  on public.rooms for select
  to anon, authenticated
  using (true);

create policy rooms_create_host
  on public.rooms for insert
  to anon, authenticated
  with check (host_pin = public.request_host_pin());

create policy rooms_update_host
  on public.rooms for update
  to anon, authenticated
  using (public.is_room_host(id))
  with check (host_pin = public.request_host_pin());

create policy rooms_delete_host
  on public.rooms for delete
  to anon, authenticated
  using (public.is_room_host(id));

create policy teams_read
  on public.teams for select
  to anon, authenticated
  using (true);

create policy teams_insert_host
  on public.teams for insert
  to anon, authenticated
  with check (public.is_room_host(room_id));

create policy teams_update_host
  on public.teams for update
  to anon, authenticated
  using (public.is_room_host(room_id))
  with check (public.is_room_host(room_id));

create policy teams_delete_host
  on public.teams for delete
  to anon, authenticated
  using (public.is_room_host(room_id));

create policy rounds_read
  on public.rounds for select
  to anon, authenticated
  using (true);

create policy rounds_insert_host
  on public.rounds for insert
  to anon, authenticated
  with check (public.is_room_host(room_id));

create policy rounds_update_host
  on public.rounds for update
  to anon, authenticated
  using (public.is_room_host(room_id))
  with check (public.is_room_host(room_id));

create policy rounds_delete_host
  on public.rounds for delete
  to anon, authenticated
  using (public.is_room_host(room_id));

create policy votes_read
  on public.votes for select
  to anon, authenticated
  using (true);

create policy votes_submit
  on public.votes for insert
  to anon, authenticated
  with check (true);

create policy votes_change_while_live
  on public.votes for update
  to anon, authenticated
  using (true)
  with check (true);

create policy votes_delete_host
  on public.votes for delete
  to anon, authenticated
  using (public.is_round_host(round_id));

create policy answers_read
  on public.answer_submissions for select
  to anon, authenticated
  using (true);

create policy answers_submit
  on public.answer_submissions for insert
  to anon, authenticated
  with check (true);

create policy answers_change
  on public.answer_submissions for update
  to anon, authenticated
  using (true)
  with check (true);

create policy answers_delete_host
  on public.answer_submissions for delete
  to anon, authenticated
  using (public.is_round_host(round_id));

create policy score_events_read
  on public.score_events for select
  to anon, authenticated
  using (true);

create policy score_events_delete_host
  on public.score_events for delete
  to anon, authenticated
  using (public.is_room_host(room_id));

revoke select on public.rooms from anon, authenticated;
grant select (id, code, status, planned_round_queue, created_at)
  on public.rooms to anon, authenticated;

grant insert, update, delete on public.rooms to anon, authenticated;
grant select, insert, update, delete on public.teams to anon, authenticated;
grant select, insert, update, delete on public.rounds to anon, authenticated;
grant select, insert, update, delete on public.votes to anon, authenticated;
grant select, insert, update, delete on public.answer_submissions to anon, authenticated;
grant select, delete on public.score_events to anon, authenticated;
