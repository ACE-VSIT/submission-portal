-- ────────────────────────────────────────────────────────────────────────────
-- ACE Submission Portal - schema + Row Level Security
-- Run with the Supabase CLI:  supabase db push
-- (or paste into Supabase Dashboard → SQL Editor)
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Roles
do $$ begin
  create type public.app_role as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

-- Difficulty + submission type enums (stored as text + CHECK in the task
-- table to keep the schema forgiving; enums are optional)
do $$ begin
  create type public.difficulty as enum ('easy', 'medium', 'hard', 'extreme');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_type as enum ('pdf', 'link', 'pdf_link');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  phone           text not null default '',
  course          text not null default '',
  college         text not null default '',
  graduation_year integer,
  role            public.app_role not null default 'student',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── domains ─────────────────────────────────────────────────────────────────
create table if not exists public.domains (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── tasks ───────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  domain_id            uuid not null references public.domains (id) on delete cascade,
  name                 text not null,
  description          text not null default '',
  instructions         text not null default '',
  difficulty           text not null check (difficulty in ('easy', 'medium', 'hard', 'extreme')),
  submission_type      text not null check (submission_type in ('pdf', 'link', 'pdf_link')),
  is_visible           boolean not null default true,
  display_order        integer not null default 0,
  allows_resubmission  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists tasks_domain_id_idx          on public.tasks (domain_id);
create index if not exists tasks_domain_order_idx       on public.tasks (domain_id, display_order);

-- ── submissions ──────────────────────────────────────────────────────────────
create table if not exists public.submissions (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references auth.users (id) on delete cascade,
  task_id          uuid not null references public.tasks (id) on delete cascade,
  domain_id        uuid not null references public.domains (id) on delete cascade,
  submission_type  text not null check (submission_type in ('pdf', 'link', 'pdf_link')),
  pdf_reference    text,               -- path/url inside the private HF storage
  links            text[] not null default '{}',
  status           text not null default 'submitted' check (status in ('submitted', 'failed')),
  submitted_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists submissions_student_id_idx on public.submissions (student_id);
create index if not exists submissions_task_id_idx    on public.submissions (task_id);
create unique index if not exists submissions_student_task_unique
  on public.submissions (student_id, task_id)
  where status = 'submitted';

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at  on public.profiles;
drop trigger if exists domains_updated_at   on public.domains;
drop trigger if exists tasks_updated_at     on public.tasks;
drop trigger if exists submissions_updated_at on public.submissions;

create trigger profiles_updated_at  before update on public.profiles    for each row execute function public.set_updated_at();
create trigger domains_updated_at   before update on public.domains     for each row execute function public.set_updated_at();
create trigger tasks_updated_at     before update on public.tasks       for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions for each row execute function public.set_updated_at();

-- ── admin helper (SECURITY DEFINER - the ONLY way role checks happen) ──────
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security - the database is the security boundary. A student who
-- bypasses the UI entirely still cannot read/write anything they don't own,
-- and can never touch admin operations.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.domains     enable row level security;
alter table public.tasks       enable row level security;
alter table public.submissions enable row level security;

-- PROFILES
-- Anyone signed in may read their own profile. Admins may read all profiles
-- (used to verify a student exists) but a student can never read another's.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Row-level update is limited to the student's own row; role can never be
-- changed by the profile owner (column-level update restriction below).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level guard: role is immutable from the client. Only a SECURITY
-- DEFINER admin function (below) can change it.
-- Prevent students from changing their own role
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
     and not public.is_admin() then
    raise exception 'Role changes are not allowed from the client.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_immutable_from_client
on public.profiles;

create trigger profiles_role_immutable_from_client
after update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute function public.prevent_role_change();

-- PROFILES INSERT trigger (mirror on signup)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin promotion helper (run once in the SQL editor with an admin role):
--   select public.set_admin_role('admin@yourorg.edu');
create or replace function public.set_admin_role(target_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'admin' where email = target_email;
end $$;

-- DOMAINS
-- Students read visible domains only; admins manage everything.
drop policy if exists "domains_select_visible" on public.domains;
create policy "domains_select_visible" on public.domains
  for select using (is_visible = true or public.is_admin());

drop policy if exists "domains_insert_admin" on public.domains;
create policy "domains_insert_admin" on public.domains
  for insert with check (public.is_admin());

drop policy if exists "domains_update_admin" on public.domains;
create policy "domains_update_admin" on public.domains
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "domains_delete_admin" on public.domains;
create policy "domains_delete_admin" on public.domains
  for delete using (public.is_admin());

-- TASKS
drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible" on public.tasks
  for select using (
    (is_visible = true and exists (
      select 1 from public.domains d where d.id = tasks.domain_id and d.is_visible = true
    ))
    or public.is_admin()
  );

drop policy if exists "tasks_insert_admin" on public.tasks;
create policy "tasks_insert_admin" on public.tasks
  for insert with check (public.is_admin());

drop policy if exists "tasks_update_admin" on public.tasks;
create policy "tasks_update_admin" on public.tasks
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tasks_delete_admin" on public.tasks;
create policy "tasks_delete_admin" on public.tasks
  for delete using (public.is_admin());

-- SUBMISSIONS
-- Students: insert only for themselves, select only their own, update only
-- their own failed rows (retry). Admins have no submission-management UI in
-- this version (out of scope) but retain read access for future review tooling.
drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own" on public.submissions
  for select using (auth.uid() = student_id or public.is_admin());

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert with check (auth.uid() = student_id);

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own" on public.submissions
  for update using (auth.uid() = student_id and status = 'failed')
  with check (auth.uid() = student_id);

drop policy if exists "submissions_delete_none" on public.submissions;
create policy "submissions_delete_none" on public.submissions
  for delete using (false);
