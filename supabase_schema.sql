-- Run this entire file in your Supabase project → SQL Editor → New query

-- Results table: one row per completed match
create table if not exists results (
  fixture_id   text primary key,
  home_team    text not null,
  away_team    text not null,
  home_score   integer,
  away_score   integer,
  played_at    timestamptz default now(),
  api_id       integer,
  status       text default 'FT',
  created_at   timestamptz default now()
);

-- AI analyses: cached per fixture
create table if not exists analyses (
  fixture_id   text primary key,
  content      text not null,
  has_result   boolean default false,
  updated_at   timestamptz default now()
);

-- Power rankings snapshot (updated by backend after each result)
create table if not exists power_rankings (
  team_id      text primary key,
  power_score  integer not null,
  cond_score   integer,
  form_score   integer,
  updated_at   timestamptz default now()
);

-- Enable Row Level Security
alter table results       enable row level security;
alter table analyses      enable row level security;
alter table power_rankings enable row level security;

-- Public read access (anyone can read results and analyses)
create policy "public read results"
  on results for select using (true);

create policy "public read analyses"
  on analyses for select using (true);

create policy "public read rankings"
  on power_rankings for select using (true);

-- Only service role can write (your backend uses service key)
create policy "service write results"
  on results for all using (auth.role() = 'service_role');

create policy "service write analyses"
  on analyses for all using (auth.role() = 'service_role');

create policy "service write rankings"
  on power_rankings for all using (auth.role() = 'service_role');
