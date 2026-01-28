-- Enable RLS and allow authenticated users to read/write all tables
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
    execute format('drop policy if exists allow_auth_all on public.%I;', r.tablename);
    execute format(
      'create policy allow_auth_all on public.%I
       for all
       using (auth.role() = ''authenticated'')
       with check (auth.role() = ''authenticated'');',
      r.tablename
    );
  end loop;
end $$;

-- Ensure authenticated role can use the public schema
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
alter default privileges in schema public grant all on tables to authenticated;

-- Apply daily count with inventory adjustment (used by the frontend)
create or replace function public.apply_daily_count(
  p_date text,
  p_variant_id integer,
  p_counted_qty numeric
) returns void
language plpgsql
security definer
as $$
declare prev_on_hand numeric;
begin
  select on_hand into prev_on_hand
  from inventory_balances
  where variant_id = p_variant_id;

  if prev_on_hand is null then
    prev_on_hand := 0;
  end if;

  insert into daily_counts (date, variant_id, counted_qty, prev_on_hand, adjustment, created_at)
  values (p_date, p_variant_id, p_counted_qty, prev_on_hand, p_counted_qty - prev_on_hand, now());

  insert into inventory_balances (variant_id, on_hand)
  values (p_variant_id, p_counted_qty)
  on conflict (variant_id)
  do update set on_hand = excluded.on_hand;
end $$;

grant execute on function public.apply_daily_count(text, integer, numeric) to authenticated;
