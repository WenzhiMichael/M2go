-- =======================
-- Setup Roles & Permissions
-- =======================

-- 1. Create user_roles table
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'staff' check (role in ('manager', 'staff')),
  created_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.user_roles enable row level security;

-- Helper function to check if user is manager (used by RLS)
create or replace function public.is_manager()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'manager'
  );
end;
$$;

grant execute on function public.is_manager() to authenticated;

-- 3. Policies

-- Allow users to read their own role
create policy "Users can read own role" on public.user_roles
  for select using (auth.uid() = user_id);

-- Allow managers to read all roles (to manage team)
create policy "Managers can read all roles" on public.user_roles
  for select using (public.is_manager());

-- Allow managers to promote users to manager (no demotion allowed)
drop policy if exists "Managers can update roles" on public.user_roles;
create policy "Managers can promote to manager" on public.user_roles
  for update
  using (public.is_manager() and role = 'staff')
  with check (role = 'manager');

-- 4. Trigger to automatically assign 'staff' role to new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, email, role)
  values (new.id, new.email, 'staff');
  return new;
end;
$$;

-- Drop trigger if exists to avoid duplication
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant permissions
grant select, update on public.user_roles to authenticated;


-- 7. Backfill existing users (if any)
insert into public.user_roles (user_id, email, role)
select id, email, 'staff'
from auth.users
where id not in (select user_id from public.user_roles);

-- 8. IMPORTANT: Set the first user as Manager (or specific email)
-- You (the admin) must run this manually or uncomment and replace:
-- update public.user_roles set role = 'manager' where email = 'your-email@example.com';
-- Or, just set the first user found:
update public.user_roles
set role = 'manager'
where user_id = (select id from auth.users order by created_at asc limit 1);
