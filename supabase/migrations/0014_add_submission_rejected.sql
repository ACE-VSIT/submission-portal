-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Add rejected flag to submissions
--
-- Lets admins/mentors mark a student's submission as rejected while reviewing
-- it from the Submissions page. Mirrors selected_for_interview:
--
--   • submissions.rejected  - per-task admin "reject this submission"
--
-- The review-guard trigger + RLS already restrict review writes to
-- admins/mentors (via is_admin_or_mentor()); rejected is added to the guarded
-- columns so students cannot set it themselves.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Rejected flag (admin-only, like selected_for_interview)
alter table public.submissions
  add column if not exists rejected boolean not null default false;

-- 2. Guard review columns (incl. rejected) from student writes
create or replace function public.prevent_student_review_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_mentor()
     and (new.selected_for_interview is distinct from old.selected_for_interview
          or new.admin_notes is distinct from old.admin_notes
          or new.rejected is distinct from old.rejected) then
    raise exception 'Only admins and mentors can update review fields.';
  end if;
  return new;
end $$;

drop trigger if exists submissions_review_guard on public.submissions;
create trigger submissions_review_guard
  after update on public.submissions
  for each row
  when (new.selected_for_interview is distinct from old.selected_for_interview
        or new.admin_notes is distinct from old.admin_notes
        or new.rejected is distinct from old.rejected)
  execute function public.prevent_student_review_update();