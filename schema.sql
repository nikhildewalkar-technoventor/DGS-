-- My Digital Journey V5
-- Run this whole file once in Supabase SQL Editor.
-- Auth setting: Authentication > Providers > Email > turn OFF "Confirm email"
-- for username-only signup.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default 'Student',
  roll_no text default '',
  class_name text default '',
  school text default '',
  bio text default '',
  interests text default '',
  location text default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text default '',
  description text default '',
  year text default '',
  stage text default 'Idea',
  problem text default '',
  skills text default '',
  outcome text default '',
  image_url text,
  created_at timestamptz not null default now()
);

-- Safe migration for projects created with an older V5 schema.
alter table public.projects add column if not exists stage text default 'Idea';
alter table public.projects add column if not exists problem text default '';
alter table public.projects add column if not exists skills text default '';
alter table public.projects add column if not exists outcome text default '';
alter table public.projects add column if not exists subject text default '';
alter table public.projects add column if not exists objective text default '';
alter table public.projects add column if not exists materials text default '';
alter table public.projects add column if not exists what_did text default '';

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text default '',
  description text default '',
  year text default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text default '',
  description text default '',
  year text default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text default '',
  description text default '',
  year text default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.activities enable row level security;
alter table public.achievements enable row level security;
alter table public.sports enable row level security;
alter table public.gallery enable row level security;

drop policy if exists "profiles own select" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles own delete" on public.profiles;
create policy "profiles own select" on public.profiles for select using (auth.uid()=id);
create policy "profiles own insert" on public.profiles for insert with check (auth.uid()=id);
create policy "profiles own update" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy "profiles own delete" on public.profiles for delete using (auth.uid()=id);

do $$ declare t text; begin
  foreach t in array array['projects','activities','achievements','sports','gallery'] loop
    execute format('drop policy if exists "%s own select" on public.%s',t,t);
    execute format('drop policy if exists "%s own insert" on public.%s',t,t);
    execute format('drop policy if exists "%s own update" on public.%s',t,t);
    execute format('drop policy if exists "%s own delete" on public.%s',t,t);
    execute format('create policy "%s own select" on public.%s for select using (auth.uid()=user_id)',t,t);
    execute format('create policy "%s own insert" on public.%s for insert with check (auth.uid()=user_id)',t,t);
    execute format('create policy "%s own update" on public.%s for update using (auth.uid()=user_id) with check (auth.uid()=user_id)',t,t);
    execute format('create policy "%s own delete" on public.%s for delete using (auth.uid()=user_id)',t,t);
  end loop;
end $$;

insert into storage.buckets (id,name,public)
values ('portfolio-images','portfolio-images',true)
on conflict (id) do update set public=true;

drop policy if exists "portfolio images public read" on storage.objects;
drop policy if exists "portfolio images own insert" on storage.objects;
drop policy if exists "portfolio images own update" on storage.objects;
drop policy if exists "portfolio images own delete" on storage.objects;

create policy "portfolio images public read" on storage.objects
for select using (bucket_id='portfolio-images');

create policy "portfolio images own insert" on storage.objects
for insert to authenticated
with check (bucket_id='portfolio-images' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "portfolio images own update" on storage.objects
for update to authenticated
using (bucket_id='portfolio-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='portfolio-images' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "portfolio images own delete" on storage.objects
for delete to authenticated
using (bucket_id='portfolio-images' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,full_name,roll_no,class_name,school)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1))),
    coalesce(new.raw_user_meta_data->>'full_name','Student'),
    coalesce(new.raw_user_meta_data->>'roll_no',''),
    coalesce(new.raw_user_meta_data->>'class_name',''),
    coalesce(new.raw_user_meta_data->>'school','')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional public portfolio sharing can be added later with a separate
-- controlled policy/view. Private-by-default is safer for school data.
