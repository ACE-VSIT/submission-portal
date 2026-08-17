-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Add Mentor Role
-- Mentors can review submissions and manage interviews, but CANNOT
-- add/edit domains or tasks. This migration:
-- 1. Adds 'mentor' to the app_role enum
-- 2. Creates is_mentor() helper function
-- 3. Updates RLS policies to restrict mentors from domain/task writes
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Add 'mentor' to the app_role enum
do $$ begin
  alter type public.app_role add value if not exists 'mentor';
exception when duplicate_object then null; end $$;

-- 2. Create is_mentor() helper function (SECURITY DEFINER like is_admin)
create or replace function public.is_mentor()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'mentor'
  );
$$;

-- 3. Create helper to check if user is admin or mentor (for read operations)
create or replace function public.is_admin_or_mentor()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'mentor')
  );
$$;

-- 4. Update DOMAINS policies
-- Mentors can read domains (same as students - visible only)
-- But mentors CANNOT insert/update/delete domains

-- Drop existing policies and recreate with mentor restrictions
drop policy if exists "domains_select_visible" on public.domains;
create policy "domains_select_visible" on public.domains
  for select using (is_visible = true or public.is_admin());

-- Only admins can insert domains (mentors cannot)
drop policy if exists "domains_insert_admin" on public.domains;
create policy "domains_insert_admin" on public.domains
  for insert with check (public.is_admin());

-- Only admins can update domains (mentors cannot)
drop policy if exists "domains_update_admin" on public.domains;
create policy "domains_update_admin" on public.domains
  for update using (public.is_admin()) with check (public.is_admin());

-- Only admins can delete domains (mentors cannot)
drop policy if exists "domains_delete_admin" on public.domains;
create policy "domains_delete_admin" on public.domains
  for delete using (public.is_admin());

-- 5. Update TASKS policies
-- Mentors can read tasks (same as students - visible only)
-- But mentors CANNOT insert/update/delete tasks

-- Drop existing policies and recreate with mentor restrictions
drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible" on public.tasks
  for select using (
    (is_visible = true and exists (
      select 1 from public.domains d where d.id = tasks.domain_id and d.is_visible = true
    ))
    or public.is_admin()
  );

-- Only admins can insert tasks (mentors cannot)
drop policy if exists "tasks_insert_admin" on public.tasks;
create policy "tasks_insert_admin" on public.tasks
  for insert with check (public.is_admin());

-- Only admins can update tasks (mentors cannot)
drop policy if exists "tasks_update_admin" on public.tasks;
create policy "tasks_update_admin" on public.tasks
  for update using (public.is_admin()) with check (public.is_admin());

-- Only admins can delete tasks (mentors cannot)
drop policy if exists "tasks_delete_admin" on public.tasks;
create policy "tasks_delete_admin" on public.tasks
  for delete using (public.is_admin());

-- 6. Update SUBMISSIONS policies
-- Mentors can read all submissions (for review purposes)
-- But cannot modify them (only admins can review)

drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own" on public.submissions
  for select using (auth.uid() = student_id or public.is_admin_or_mentor());

-- 7. Create set_mentor_role helper function (run once in SQL editor with admin role)
-- Usage: select public.set_mentor_role('mentor@yourorg.edu');
create or replace function public.set_mentor_role(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_role_change', 'true', true);

  update public.profiles
  set role = 'mentor'
  where email = target_email;

  perform set_config('app.allow_role_change', 'false', true);
end;
$$;

-- 8. Add comment explaining the mentor role
comment on function public.is_mentor() is 'Returns true if the current user has the mentor role. Mentors can review submissions but cannot manage domains or tasks.';
comment on function public.is_admin_or_mentor() is 'Returns true if the current user has admin or mentor role. Used for read-only access to submissions.';
comment on function public.set_mentor_role(target_email text) is 'Promotes a user to mentor role. Run with admin privileges in SQL Editor.';
