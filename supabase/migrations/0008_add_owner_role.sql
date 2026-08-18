-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Add Owner Role
-- The owner has ALL admin permissions plus user management (view all profiles,
-- change any user's role). This migration:
-- 1. Adds 'owner' to the app_role enum
-- 2. Creates is_owner() and is_admin_or_owner() helper functions
-- 3. Updates is_admin() to also include owner
-- 4. Updates RLS policies so owner inherits admin permissions
-- 5. Allows owner to update any profile (for role changes)
-- 6. Creates set_owner_role helper function
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Add 'owner' to the app_role enum
do $$ begin
  alter type public.app_role add value if not exists 'owner';
exception when duplicate_object then null; end $$;

-- 2. Create is_owner() helper function
create or replace function public.is_owner()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- 3. Create helper to check if user is admin or owner (for admin-level writes)
create or replace function public.is_admin_or_owner()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

-- 4. Update is_admin() to include owner (owner gets ALL admin permissions)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

-- 5. Update is_admin_or_mentor() to include owner
create or replace function public.is_admin_or_mentor()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'mentor', 'owner')
  );
$$;

-- 6. Allow owner to read ALL profiles (for user management page)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- 7. Allow owner to update any profile (for role changes)
--    The prevent_role_change trigger will be updated to allow owner too
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_owner())
  with check (auth.uid() = id or public.is_owner());

-- 8. Update prevent_role_change trigger to allow owner to change roles
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role
     and current_setting('app.allow_role_change', true) is distinct from 'true'
  then
    raise exception 'Role changes are not allowed from the client.';
  end if;

  return new;
end;
$$;

-- 9. Update prevent_student_review_update to include owner
create or replace function public.prevent_student_review_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and (new.selected_for_interview is distinct from old.selected_for_interview
          or new.admin_notes is distinct from old.admin_notes) then
    raise exception 'Only admins can update review fields.';
  end if;
  return new;
end $$;

-- 10. Create set_owner_role helper function
-- Usage: select public.set_owner_role('owner@yourorg.edu');
create or replace function public.set_owner_role(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_role_change', 'true', true);

  update public.profiles
  set role = 'owner'
  where email = target_email;

  perform set_config('app.allow_role_change', 'false', true);
end;
$$;

-- 11. Add comments
comment on function public.is_owner() is 'Returns true if the current user has the owner role. Owners have all admin permissions plus user management.';
comment on function public.is_admin_or_owner() is 'Returns true if the current user has admin or owner role.';
comment on function public.set_owner_role(target_email text) is 'Promotes a user to owner role. Run with admin privileges in SQL Editor.';
