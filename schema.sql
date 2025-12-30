
-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  job_title text,
  seniority text,
  industry text,
  difficulty text,
  tts_speed_pref text,
  focus_areas jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
on public.profiles for select 
using ( auth.uid() = id );

create policy "Users can update own profile" 
on public.profiles for update 
using ( auth.uid() = id );

create policy "Users can insert own profile" 
on public.profiles for insert 
with check ( auth.uid() = id );

-- 2. PRACTICE SESSIONS TABLE
create table if not exists public.practice_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  client_session_id text not null,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Unique constraint to prevent duplicate sessions
alter table public.practice_sessions 
add constraint practice_sessions_client_session_id_key 
unique (client_session_id);

-- RLS for practice_sessions
alter table public.practice_sessions enable row level security;

create policy "Users can view own practice sessions" 
on public.practice_sessions for select 
using ( auth.uid() = user_id );

create policy "Users can insert own practice sessions" 
on public.practice_sessions for insert 
with check ( auth.uid() = user_id );

create policy "Users can update own practice sessions" 
on public.practice_sessions for update 
using ( auth.uid() = user_id );
