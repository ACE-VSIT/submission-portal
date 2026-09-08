-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Person-level rejection flag
--
-- Rejection applies to the STUDENT, not to an individual submission. It lives
-- on profiles.rejected (like selected_for_interview is per-task, rejection is
-- per-person):
--
--   • profiles.rejected  - admin/mentor may flag a student as rejected
--
-- Security:
--   1. profiles_update_own (RLS) lets students update their own row, so a
--      trigger guards the rejected column - students can never flip it.
--   2. set_student_rejected() is a SECURITY DEFINER helper (RPC) that calls
--      is_admin_or_mentor() before writing, so only staff can change it even
--      though RLS blocks admin-only updates to other people's profiles.
--
-- If the earlier per-submission draft of this column was already applied, the
-- submitted `rejected` column is cleaned up here so both histories converge.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Rejected flag on the person (profiles)
alter table public.profiles
  add column if not exists rejected boolean not null default false;

-- 2. Guard profiles.rejected from student writes
create or replace function public.prevent_student_rejected_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_mentor()
     and new.rejected is distinct from old.rejected then
    raise exception 'Only admins and mentors can update rejection status.';
  end if;
  return new;
end $$;

drop trigger if exists profiles_rejected_guard on public.profiles;
create trigger profiles_rejected_guard
  before update on public.profiles
  for each row
  when (new.rejected is distinct from old.rejected)
  execute function public.prevent_student_rejected_update();

-- 3. Admin/mentor-only helper so the client can flip the flag via RPC
create or replace function public.set_student_rejected(target_student_id uuid, rejected boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_mentor() then
    raise exception 'Only admins and mentors can update rejection status.';
  end if;

  update public.profiles
  set rejected = set_student_rejected.rejected
  where id = target_student_id;
end $$;

comment on function public.set_student_rejected(uuid, boolean) is
  'Sets a student''s rejected flag. Restricted to admins and mentors.';
