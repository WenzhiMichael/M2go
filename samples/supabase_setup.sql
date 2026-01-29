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
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- Restrict audit_logs to read/insert only (no update/delete)
drop policy if exists allow_auth_all on public.audit_logs;
drop policy if exists audit_logs_select on public.audit_logs;
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (auth.role() = 'authenticated');
create policy audit_logs_insert on public.audit_logs
  for insert with check (auth.role() = 'authenticated');

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

-- Audit trigger function
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_row_id text;
begin
  if (tg_op = 'DELETE') then
    v_row_id := coalesce(old.id::text, old.key::text, old.variant_id::text);
    insert into audit_logs (table_name, action, row_id, old_data, new_data, user_id)
    values (tg_table_name, 'DELETE', v_row_id, to_jsonb(old), null, auth.uid());
    return old;
  elsif (tg_op = 'UPDATE') then
    v_row_id := coalesce(new.id::text, old.id::text, new.key::text, old.key::text, new.variant_id::text, old.variant_id::text);
    insert into audit_logs (table_name, action, row_id, old_data, new_data, user_id)
    values (tg_table_name, 'UPDATE', v_row_id, to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  else
    v_row_id := coalesce(new.id::text, new.key::text, new.variant_id::text);
    insert into audit_logs (table_name, action, row_id, old_data, new_data, user_id)
    values (tg_table_name, 'INSERT', v_row_id, null, to_jsonb(new), auth.uid());
    return new;
  end if;
end $$;

drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.log_audit();

drop trigger if exists audit_variants on public.variants;
create trigger audit_variants after insert or update or delete on public.variants
  for each row execute function public.log_audit();

drop trigger if exists audit_inventory_balances on public.inventory_balances;
create trigger audit_inventory_balances after insert or update or delete on public.inventory_balances
  for each row execute function public.log_audit();

drop trigger if exists audit_daily_counts on public.daily_counts;
create trigger audit_daily_counts after insert or update or delete on public.daily_counts
  for each row execute function public.log_audit();

drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after insert or update or delete on public.orders
  for each row execute function public.log_audit();

drop trigger if exists audit_order_lines on public.order_lines;
create trigger audit_order_lines after insert or update or delete on public.order_lines
  for each row execute function public.log_audit();

drop trigger if exists audit_settings on public.settings;
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function public.log_audit();
