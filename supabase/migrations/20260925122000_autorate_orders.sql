create table if not exists public.autorate_orders (
  id uuid primary key default gen_random_uuid(),
  access_hash text not null check (access_hash ~ '^[a-f0-9]{64}$'),
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and length(profile::text) <= 3000),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  checkout_session_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.autorate_orders enable row level security;
revoke all on public.autorate_orders from anon, authenticated;
create index if not exists autorate_orders_created_idx on public.autorate_orders (created_at);
