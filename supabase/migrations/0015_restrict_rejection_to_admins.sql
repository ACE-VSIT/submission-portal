-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Restrict student rejection to admins
--
-- 0014 allowed admins/mentors to set profiles.rejected. This tightens that:
-- only admins (admin + owner via public.is_admin()) may reject a student.
-- Mentors can still review/select submissions but cannot reject or un-reject.
-- ────────────────────────────────────────────────────────────────────────────

-- Guard: only admins/owners may change the rejected flag
create or replace function public.prevent_student_rejected_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and new.rejected is distinct from old.rejected then
    raise exception 'Only admins can update rejection status.';
  end if;
  return new;
end $$;

drop trigger if exists profiles_rejected_guard on public.profiles;
create trigger profiles_rejected_guard
  before update on public.profiles
  for each row
  when (new.rejected is distinct from old.rejected)
  execute function public.prevent_student_rejected_update();

-- RPC helper: check is_admin() before writing
create or replace function public.set_student_rejected(target_student_id uuid, rejected boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update rejection status.';
  end if;

  update public.profiles
  set rejected = set_student_rejected.rejected
  where id = target_student_id;
end $$;

comment on function public.set_student_rejected(uuid, boolean) is
  'Sets a student''s rejected flag. Restricted to admins (admin/owner).';