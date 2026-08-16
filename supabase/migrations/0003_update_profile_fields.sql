-- ────────────────────────────────────────────────────────────────────────────
-- Update profiles table: remove college, graduation_year; restrict course to BCA/MCA
-- Run with the Supabase CLI:  supabase db push
-- ────────────────────────────────────────────────────────────────────────────

-- Add CHECK constraint to restrict course to only 'BCA' or 'MCA'
-- First, update any existing invalid course values to a default (optional, for safety)
update public.profiles
set course = 'BCA'
where course not in ('BCA', 'MCA');

-- Add the CHECK constraint
alter table public.profiles
drop constraint if exists profiles_course_check;

alter table public.profiles
add constraint profiles_course_check check (course in ('BCA', 'MCA'));

-- Drop the college column
alter table public.profiles
drop column if exists college;

-- Drop the graduation_year column
alter table public.profiles
drop column if exists graduation_year;