-- ============================================================
-- DayDesk schema
-- Paste this entire file into Supabase SQL Editor and run it.
-- It creates the tables, indexes, and Row Level Security policies
-- so each user can only see/modify their own tasks.
-- ============================================================

-- AREAS (themes / focus areas)
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists areas_user_id_idx on public.areas(user_id);

-- CATEGORIES (work types with color)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6B7280',
  created_at timestamptz not null default now()
);
create index if not exists categories_user_id_idx on public.categories(user_id);

-- TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  urgency text not null default 'must' check (urgency in ('must', 'nice')),
  priority text not null default 'none' check (priority in ('none', 'high', 'medium', 'low')),
  day date,                        -- null when isSomeday = true
  is_someday boolean not null default false,
  area_id uuid references public.areas(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  subtasks jsonb not null default '[]',  -- [{title: string, done: boolean}]
  due_date date,
  recurrence jsonb,                -- {type, weekdays?, dayOfMonth?} or null
  recurrence_template_id uuid references public.tasks(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  rolled_over boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_day_idx on public.tasks(user_id, day);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);

-- USER SETTINGS (theme, mode, last backup date, etc.)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  mode text not null default 'normal' check (mode in ('normal', 'focused')),
  last_maintenance date,
  seeded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY: each user sees only their own data
-- ============================================================
alter table public.areas enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.user_settings enable row level security;

-- AREAS policies
create policy "Users can read their own areas"
  on public.areas for select using (auth.uid() = user_id);
create policy "Users can insert their own areas"
  on public.areas for insert with check (auth.uid() = user_id);
create policy "Users can update their own areas"
  on public.areas for update using (auth.uid() = user_id);
create policy "Users can delete their own areas"
  on public.areas for delete using (auth.uid() = user_id);

-- CATEGORIES policies
create policy "Users can read their own categories"
  on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories"
  on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories"
  on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories"
  on public.categories for delete using (auth.uid() = user_id);

-- TASKS policies
create policy "Users can read their own tasks"
  on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks"
  on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

-- USER SETTINGS policies
create policy "Users can read their own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create user_settings + seed default categories
-- when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  insert into public.categories (user_id, name, color) values
    (new.id, 'Meetings', '#8B5CF6'),
    (new.id, 'Documentation', '#0EA5E9'),
    (new.id, 'Coding', '#10B981'),
    (new.id, 'Analysis', '#F59E0B'),
    (new.id, 'Ideating', '#EC4899');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
