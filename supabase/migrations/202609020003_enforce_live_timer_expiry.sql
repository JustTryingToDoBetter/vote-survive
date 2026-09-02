-- Timers remain visually driven by clients, but their expiry must be enforced
-- by the database so a sleeping host tab cannot leave interaction open.
create or replace function public.lock_expired_room_interactions(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rounds
  set status = 'locked'
  where room_id = p_room_id
    and status = 'voting'
    and started_at is not null
    and coalesce(timer_seconds, 0) > 0
    and clock_timestamp() >= started_at + make_interval(secs => timer_seconds);

  update public.rounds
  set question_status = 'locked'
  where room_id = p_room_id
    and status = 'live'
    and question_status = 'live'
    and question_started_at is not null
    and question_set is not null
    and clock_timestamp() >= question_started_at + make_interval(
      secs => coalesce(
        nullif(question_set -> coalesce(current_question_index, 0) ->> 'timeLimitSeconds', '')::integer,
        15
      )
    );
end;
$$;

-- A vote after the configured end time cannot be accepted, even if the host
-- browser has been suspended and has not performed its local auto-lock yet.
create or replace function public.validate_vote_timer_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  select room_id into v_room_id from public.rounds where id = new.round_id;
  if v_room_id is not null then
    perform public.lock_expired_room_interactions(v_room_id);
  end if;

  if not exists (
    select 1 from public.rounds where id = new.round_id and status = 'voting'
  ) then
    raise exception 'Voting has closed for this round.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_vote_timer_expiry_trigger on public.votes;
create trigger validate_vote_timer_expiry_trigger
  before insert or update on public.votes
  for each row
  execute function public.validate_vote_timer_expiry();

-- Ensure any normal bootstrap/recovery read also catches a missed client-side
-- lock and returns the authoritative locked state.
alter function public.bootstrap_room_state(uuid) rename to bootstrap_room_state_unchecked;
revoke all on function public.bootstrap_room_state_unchecked(uuid) from public, anon, authenticated;

create or replace function public.bootstrap_room_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lock_expired_room_interactions(p_room_id);
  return public.bootstrap_room_state_unchecked(p_room_id);
end;
$$;

grant execute on function public.bootstrap_room_state(uuid) to anon, authenticated;
