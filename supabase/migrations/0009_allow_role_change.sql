-- ────────────────────────────────────────────────────────────────────────────
-- Migration: 0009_fix_role_change_trigger.sql
--
-- Fixes error: "Role changes are not allowed from the client."
--
-- The trigger `prevent_role_change` previously only allowed role updates
-- if the session variable `app.allow_role_change` was set to 'true'.
-- This made it impossible for admins/owners to change a user's role
-- directly from the SQL editor or client, even though they have
-- administrative privileges.
--
-- This migration modifies the trigger to allow role changes when the
-- current user is an admin or owner (via `public.is_admin()`), without
-- requiring the session variable. The variable is still required for
-- students or mentors attempting to change roles (which should be
-- disallowed).
--
-- Run with:  supabase db push   (or paste into Dashboard → SQL Editor)
-- ────────────────────────────────────────────────────────────────────────────

-- Replace the trigger function with an updated version that checks
-- `is_admin()` before enforcing the session variable requirement.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
     and not public.is_admin()
     and current_setting('app.allow_role_change', true) is distinct from 'true'
  then
    raise exception 'Role changes are not allowed from the client.';
  end if;

  return new;
end;
$$;

-- The trigger itself remains unchanged – it still calls the same function.
-- No need to drop/recreate the trigger, as the function is replaced.
