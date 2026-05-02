create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  theme text not null,
  category text,
  club text,
  date date not null,
  "endDate" date,
  time text,
  venue text,
  resourcePerson text,
  audience text,
  description text,
  brochureLink text,
  bannerImage text
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  theme text not null,
  competition_type text not null default 'Individual',
  min_team_limit integer default 0,
  max_team_limit integer default 0,
  teamLimit integer default 0,
  category text,
  club text,
  eventId text,
  competitionDate date not null,
  "competitionEndDate" date,
  time text,
  venue text,
  audience text,
  facultyCoordinator text,
  studentCoordinator text,
  description text,
  prize text,
  rulesLink text
);

alter table public.events add column if not exists "endDate" date;
alter table public.competitions add column if not exists "competitionEndDate" date;
alter table public.competitions add column if not exists min_team_limit integer default 0;
alter table public.competitions add column if not exists max_team_limit integer default 0;
alter table public.competitions add column if not exists audience text;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  competition_id uuid references public.competitions(id) on delete cascade,
  student_name text not null,
  register_number text not null,
  department text,
  semester text,
  email text,
  contact_number text,
  team_members jsonb,
  status text not null default 'Registered'
);

create unique index if not exists registrations_competition_register_number_idx
on public.registrations (competition_id, register_number);

do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'public.registrations'::regclass
    and contype = 'f'
    and array_length(conkey, 1) = 1
    and conkey[1] = (
      select attnum
      from pg_attribute
      where attrelid = 'public.registrations'::regclass
        and attname = 'competition_id'
    )
  limit 1;

  if existing_constraint is not null then
    execute format('alter table public.registrations drop constraint %I', existing_constraint);
  end if;

  alter table public.registrations
    add constraint registrations_competition_id_fkey
    foreign key (competition_id)
    references public.competitions(id)
    on delete cascade;
end $$;

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  subtitle text,
  image_url text,
  cta_link text default 'events.html',
  display_order integer default 0,
  category text default 'featured'
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_type text not null check (contact_type in ('support', 'coordinator')),
  title text,
  email text,
  phone text,
  timing text,
  address text,
  detail text,
  club_name text,
  faculty_coordinator text,
  student_coordinator text,
  student_coordinator_class text,
  display_order integer default 0
);

alter table public.contacts add column if not exists phone text;
alter table public.contacts add column if not exists timing text;
alter table public.contacts add column if not exists address text;
alter table public.contacts add column if not exists student_coordinator_class text;

create table if not exists public.login_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  display_name text not null,
  role text not null check (role in ('admin', 'student', 'coordinator')),
  club text,
  username text not null unique,
  password text not null,
  active boolean not null default true
);

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

alter table public.events enable row level security;
alter table public.competitions enable row level security;
alter table public.registrations enable row level security;
alter table public.highlights enable row level security;
alter table public.contacts enable row level security;
alter table public.login_users enable row level security;

drop policy if exists "public events access" on public.events;
create policy "public events access" on public.events for all using (true) with check (true);

drop policy if exists "public competitions access" on public.competitions;
create policy "public competitions access" on public.competitions for all using (true) with check (true);

drop policy if exists "public registrations access" on public.registrations;
create policy "public registrations access" on public.registrations for all using (true) with check (true);

drop policy if exists "public highlights access" on public.highlights;
create policy "public highlights access" on public.highlights for all using (true) with check (true);

drop policy if exists "public contacts access" on public.contacts;
create policy "public contacts access" on public.contacts for all using (true) with check (true);

drop policy if exists "public login users access" on public.login_users;
create policy "public login users access" on public.login_users for all using (true) with check (true);

insert into public.highlights (title, subtitle, image_url, cta_link, display_order, category)
select
  'Innovation Week',
  'Featured academic showcases, competitions and club-led demos across campus.',
  'assets/images/event-scene.svg',
  'events.html',
  1,
  'featured'
where not exists (select 1 from public.highlights);

insert into public.contacts (contact_type, title, email, phone, timing, address, detail, club_name, faculty_coordinator, student_coordinator, student_coordinator_class, display_order)
select valueset.contact_type, valueset.title, valueset.email, valueset.phone, valueset.timing, valueset.address, valueset.detail, valueset.club_name, valueset.faculty_coordinator, valueset.student_coordinator, valueset.student_coordinator_class, valueset.display_order
from (
  values
    ('support', 'College Office', 'college@trishaems.edu', '+91 98765 43210', null, null, '+91 98765 43210', null, null, null, null, 1),
    ('support', 'Event Desk', 'events@trishaems.edu', '+91 98450 23456', null, null, '+91 98450 23456', null, null, null, null, 2),
    ('support', 'Technical Support', 'support@trishaems.edu', null, 'Mon-Sat, 9:00 AM to 5:00 PM', null, 'Mon-Sat, 9:00 AM to 5:00 PM', null, null, null, null, 3),
    ('coordinator', null, null, null, null, null, null, 'Coding Club', 'Dr. Shrinivas', 'Swasthik C Shetty', '3rd BCA', 1),
    ('coordinator', null, null, null, null, null, null, 'Cultural Club', 'Prof. Divyashree', 'Rashmitha', '2nd BCOM', 2),
    ('coordinator', null, null, null, null, null, null, 'Sports Club', 'Mr. Dheeraj', 'Shriprada', '1st BCA', 3),
    ('coordinator', null, null, null, null, null, null, 'Management Club', 'Prof. Harini', 'Pallavi', '3rd BCOM', 4)
) as valueset(contact_type, title, email, phone, timing, address, detail, club_name, faculty_coordinator, student_coordinator, student_coordinator_class, display_order)
where not exists (select 1 from public.contacts);

insert into public.login_users (display_name, role, club, username, password, active)
select valueset.display_name, valueset.role, valueset.club, valueset.username, valueset.password, valueset.active
from (
  values
    ('Administrator', 'admin', '', 'admin', 'admin123', true),
    ('Student Demo', 'student', '', 'student', 'student123', true),
    ('Coding Club Coordinator', 'coordinator', 'Coding Club', 'coding.coordinator', 'coding123', true),
    ('Cultural Club Coordinator', 'coordinator', 'Cultural Club', 'cultural.coordinator', 'cultural123', true),
    ('Sports Club Coordinator', 'coordinator', 'Sports Club', 'sports.coordinator', 'sports123', true),
    ('Management Club Coordinator', 'coordinator', 'Management Club', 'management.coordinator', 'management123', true)
) as valueset(display_name, role, club, username, password, active)
where not exists (select 1 from public.login_users where public.login_users.username = valueset.username);
