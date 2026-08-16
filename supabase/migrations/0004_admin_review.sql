-- ────────────────────────────────────────────────────────────────────────────
-- Admin review & interview pipeline (migrated from admintable-old)
--
-- Adds everything the admin needs to track submissions end-to-end:
--   • submissions.selected_for_interview  — per-task "shortlist for interview"
--   • submissions.admin_notes             — per-task private admin notes
--   • interview_records                   — per student × domain interview state
--       (interview_done, selected_for_ace, notes)
--
-- Run with:  supabase db push   (or paste into Dashboard → SQL Editor)
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Submission review columns ───────────────────────────────────────────────
alter table public.submissions
  add column if not exists selected_for_interview boolean not null default false;

alter table public.submissions
  add column if not exists admin_notes text;

-- 2) Interview records ───────────────────────────────────────────────────────
create table if not exists public.interview_records (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references auth.users (id) on delete cascade,
  domain_id        uuid not null references public.domains (id) on delete cascade,
  interview_done   boolean not null default false,
  selected_for_ace boolean not null default false,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, domain_id)
);

create index if not exists interview_records_student_idx on public.interview_records (student_id);
create index if not exists interview_records_domain_idx  on public.interview_records (domain_id);

drop trigger if exists interview_records_updated_at on public.interview_records;
create trigger interview_records_updated_at
  before update on public.interview_records
  for each row execute function public.set_updated_at();

-- RLS — admin-only, same style as domains/tasks policies.
alter table public.interview_records enable row level security;

drop policy if exists "interview_records_select_admin" on public.interview_records;
create policy "interview_records_select_admin" on public.interview_records
  for select using (public.is_admin());

drop policy if exists "interview_records_insert_admin" on public.interview_records;
create policy "interview_records_insert_admin" on public.interview_records
  for insert with check (public.is_admin());

drop policy if exists "interview_records_update_admin" on public.interview_records;
create policy "interview_records_update_admin" on public.interview_records
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "interview_records_delete_admin" on public.interview_records;
create policy "interview_records_delete_admin" on public.interview_records
  for delete using (public.is_admin());

-- 3) Admins may update submission review fields (students keep their own-row
--    update for failed resubmission only — see submissions_update_own).
drop policy if exists "submissions_review_admin" on public.submissions;
create policy "submissions_review_admin" on public.submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- Guard: review columns are admin-only, even though students can UPDATE their
-- own failed rows. A student bypassing the UI still cannot mark themselves
-- "selected for interview" or alter admin notes.
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

drop trigger if exists submissions_review_guard on public.submissions;
create trigger submissions_review_guard
after update on public.submissions
for each row
when (new.selected_for_interview is distinct from old.selected_for_interview
      or new.admin_notes is distinct from old.admin_notes)
execute function public.prevent_student_review_update();
