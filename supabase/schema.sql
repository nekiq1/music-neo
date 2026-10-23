-- Music Neo — free tier Supabase schema
-- Run in Supabase SQL editor. Optional: app works without DB (guest mode).

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  username text,
  first_name text,
  photo_url text,
  settings jsonb default '{"quality":"auto","volume":0.8,"normalize":true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  track_id text not null,
  created_at timestamptz default now(),
  unique(profile_id, track_id)
);

create table if not exists play_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  track_id text not null,
  played_at timestamptz default now()
);

create index if not exists idx_favorites_profile on favorites(profile_id);
create index if not exists idx_history_profile on play_history(profile_id);

alter table profiles enable row level security;
alter table favorites enable row level security;
alter table play_history enable row level security;

-- For production: tighten policies with auth.uid() / telegram JWT
create policy "public read profiles" on profiles for select using (true);
create policy "public upsert profiles" on profiles for insert with check (true);
create policy "public update own profile" on profiles for update using (true);

create policy "public read favorites" on favorites for select using (true);
create policy "public write favorites" on favorites for insert with check (true);
create policy "public delete favorites" on favorites for delete using (true);

create policy "public read history" on play_history for select using (true);
create policy "public write history" on play_history for insert with check (true);
