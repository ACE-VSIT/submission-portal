-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Mentor review toggle
--
-- Adds a single-row `portal_settings` table that lets admins turn OFF the
-- ability for mentors to shortlist submissions ("selected for interview") and
-- edit private review notes on the Submissions page. The Interviews page is
-- NOT affected - its notes/selection live in `interview_records` and remain
-- editable.
--
--   • default ON  - mentors can select for interview + add notes
--   • staff (admin / mentor / owner) can READ the setting (so the UI knows
--     whether mentoring review is enabled)
--   • only admins / owners can CHANGE it
--   • the review-guard trigger is extended so a mentor who bypasses the UI
--     is still blocked server-side while the setting is off (admins always
--     remain able to review)
--
-- Run with:  supabase db push   (or paste into Dashboard → SQL Editor)
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Single-row settings table ───────────────────────────────────────────────
create table if not exists public.portal_settings (
  id                    boolean primary key default true,
  mentor_review_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint portal_settings_single_row check (id = true)
);

drop trigger if exists portal_settings_updated_at on public.portal_settings;
create trigger portal_settings_updated_at
  before update on public.portal_settings
  for each row execute function public.set_updated_at();

insert into public.portal_settings (id, mentor_review_enabled)
values (true, true)
on conflict (id) do nothing;

-- 2. RLS ─────────────────────────────────────────────────────────────────────
alter table public.portal_settings enable row level security;

drop policy if exists "portal_settings_select_staff" on public.portal_settings;
create policy "portal_settings_select_staff" on public.portal_settings
  for select using (public.is_admin_or_mentor());

drop policy if exists "portal_settings_insert_admin" on public.portal_settings;
create policy "portal_settings_insert_admin" on public.portal_settings
  for insert with check (public.is_admin());

drop policy if exists "portal_settings_update_admin" on public.portal_settings;
create policy "portal_settings_update_admin" on public.portal_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "portal_settings_delete_admin" on public.portal_settings;
create policy "portal_settings_delete_admin" on public.portal_settings
  for delete using (public.is_admin());

-- 3. Extend the review guard so the toggle is enforced server-side ──────────
create or replace function public.prevent_student_review_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  review_enabled boolean;
begin
  if new.selected_for_interview is distinct from old.selected_for_interview
     or new.admin_notes is distinct from old.admin_notes then
    if not public.is_admin() then
      if public.is_mentor() then
        select p.mentor_review_enabled into review_enabled
        from public.portal_settings p
        where p.id = true;
        if coalesce(review_enabled, true) then
          return new;
        end if;
        raise exception 'Mentor review is currently disabled.';
      end if;
      raise exception 'Only admins and mentors can update review fields.';
    end if;
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