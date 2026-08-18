-- ────────────────────────────────────────────────────────────────────────────
-- Add enrollment_no column to profiles
-- Run with the Supabase CLI:  supabase db push
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles
add column if not exists enrollment_no text not null default '';
