alter table public.profiles
drop constraint if exists profiles_course_check;

alter table public.profiles
add constraint profiles_course_check
check (
  course = ''
  or course in ('BCA', 'MCA')
);
