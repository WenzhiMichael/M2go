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

-- 3. Policies

-- Allow users to read their own role
create policy "Users can read own role" on public.user_roles
  for select using (auth.uid() = user_id);

-- Allow managers to read all roles (to manage team)
create policy "Managers can read all roles" on public.user_roles
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'manager')
  );

-- Allow managers to update roles (promote/demote)
create policy "Managers can update roles" on public.user_roles
  for update using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'manager')
  );

-- 4. Trigger to automatically assign 'staff' role to new users
create or replace function public.handle_new_user()
returns trigger as 1352
begin
  insert into public.user_roles (user_id, email, role)
  values (new.id, new.email, 'staff');
  return new;
end;
1352 language plpgsql security definer;

-- Drop trigger if exists to avoid duplication
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Helper function to check if user is manager (optional, but useful for RLS)
create or replace function public.is_manager()
returns boolean as 1352
begin
  return exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'manager'
  );
end;
1352 language plpgsql security definer;

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
