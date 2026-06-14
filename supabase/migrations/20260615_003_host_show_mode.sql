alter table public.rooms
  add column if not exists planned_round_queue jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_planned_round_queue_array_check'
  ) then
    alter table public.rooms
      add constraint rooms_planned_round_queue_array_check
      check (jsonb_typeof(planned_round_queue) = 'array')
      not valid;
  end if;
end $$;
