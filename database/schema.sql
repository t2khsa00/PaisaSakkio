create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'EUR',
  invite_code text unique not null,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted')),
  sent_at timestamptz not null default now(),
  unique (group_id, email)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  paid_by_profile_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  receipt_path text,
  receipt_name text,
  receipt_type text,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists receipt_name text;
alter table public.expenses add column if not exists receipt_type text;

create table if not exists public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  primary key (expense_id, profile_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id),
  to_profile_id uuid not null references public.profiles(id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  note text,
  settled_at timestamptz not null default now(),
  created_by_profile_id uuid not null references public.profiles(id)
);

create table if not exists public.duties (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text,
  assignee_profile_id uuid references public.profiles(id),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  linked_expense_id uuid references public.expenses(id) on delete set null,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.duties enable row level security;

-- Personal money tracker (per-user, not shared)
create table if not exists public.personal_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'expense' check (type in ('expense', 'income')),
  title text not null,
  note text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  category text not null default 'Other',
  occurred_on date not null default current_date,
  receipt_path text,
  receipt_name text,
  receipt_type text,
  created_at timestamptz not null default now()
);

alter table public.personal_transactions add column if not exists receipt_path text;
alter table public.personal_transactions add column if not exists receipt_name text;
alter table public.personal_transactions add column if not exists receipt_type text;

create table if not exists public.personal_budgets (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'EUR',
  updated_at timestamptz not null default now(),
  primary key (profile_id, category)
);

alter table public.personal_transactions enable row level security;
alter table public.personal_budgets enable row level security;

create index if not exists personal_tx_profile_idx on public.personal_transactions(profile_id, occurred_on desc);

create index if not exists groups_invite_code_idx on public.groups(invite_code);
create index if not exists group_members_profile_idx on public.group_members(profile_id);
create index if not exists group_invitations_group_idx on public.group_invitations(group_id, sent_at desc);
create index if not exists expenses_group_idx on public.expenses(group_id, created_at desc);
create index if not exists duties_group_idx on public.duties(group_id, created_at desc);
