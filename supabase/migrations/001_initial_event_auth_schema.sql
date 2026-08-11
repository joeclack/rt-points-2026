create extension if not exists "pgcrypto";

create type public.event_visibility as enum ('public', 'private');
create type public.event_status as enum ('draft', 'live', 'finished');
create type public.event_admin_role as enum ('owner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  date_label text,
  location text,
  visibility public.event_visibility not null default 'public',
  football_enabled boolean not null default false,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_admins (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.event_admin_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  colour text not null default '#14b8a6',
  badge_text text,
  badge_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_visibility_name_idx on public.events (visibility, name);
create index events_owner_id_idx on public.events (owner_id);
create index teams_event_id_idx on public.teams (event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_event_admin(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.event_admins
    where event_id = target_event_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_admins enable row level security;
alter table public.teams enable row level security;

create policy "Profiles can read their own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Profiles can update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Public can read visible events"
on public.events for select
using (visibility = 'public' or owner_id = auth.uid() or public.is_event_admin(id));

create policy "Authenticated users can create events"
on public.events for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners and admins can update events"
on public.events for update
to authenticated
using (owner_id = auth.uid() or public.is_event_admin(id))
with check (owner_id = auth.uid() or public.is_event_admin(id));

create policy "Owners and admins can delete events"
on public.events for delete
to authenticated
using (owner_id = auth.uid() or public.is_event_admin(id));

create policy "Admins can read event admin rows"
on public.event_admins for select
to authenticated
using (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "Event owners can manage event admin rows"
on public.event_admins for all
to authenticated
using (
  exists (
    select 1 from public.events
    where events.id = event_admins.event_id
      and events.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events
    where events.id = event_admins.event_id
      and events.owner_id = auth.uid()
  )
);

create policy "Public can read teams for visible events"
on public.teams for select
using (
  exists (
    select 1 from public.events
    where events.id = teams.event_id
      and (events.visibility = 'public' or events.owner_id = auth.uid() or public.is_event_admin(events.id))
  )
);

create policy "Event admins can manage teams"
on public.teams for all
to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create or replace function public.add_owner_event_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_admins (event_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (event_id, user_id) do nothing;

  return new;
end;
$$;

create trigger events_add_owner_event_admin
after insert on public.events
for each row execute function public.add_owner_event_admin();
