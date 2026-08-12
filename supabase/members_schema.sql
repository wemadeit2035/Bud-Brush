-- Members and consent schema for BudBrush POS
-- Includes audit fields and transaction linkage.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  membership_number text unique not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  status text not null default 'active',
  consent_version text,
  consent_signed_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_status_check check (status in ('active', 'suspended', 'inactive'))
);

create index if not exists idx_members_phone on public.members(phone);
create index if not exists idx_members_membership_number on public.members(membership_number);

create table if not exists public.member_consents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  consent_version text not null,
  signed_at timestamptz not null default now(),
  signed_by_staff text,
  form_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists member_id uuid references public.members(id);

create index if not exists idx_transactions_member_id on public.transactions(member_id);

-- Optional trigger to maintain updated_at fields
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_members_set_updated_at on public.members;
create trigger trg_members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

-- RLS starter policies (adjust auth model for production)
alter table public.members enable row level security;
alter table public.member_consents enable row level security;

-- Read/write for authenticated staff accounts
drop policy if exists members_select_authenticated on public.members;
create policy members_select_authenticated
on public.members
for select
to authenticated
using (true);

drop policy if exists members_select_anon on public.members;
create policy members_select_anon
on public.members
for select
to anon
using (true);

drop policy if exists members_insert_authenticated on public.members;
create policy members_insert_authenticated
on public.members
for insert
to authenticated
with check (true);

drop policy if exists members_insert_anon on public.members;
create policy members_insert_anon
on public.members
for insert
to anon
with check (true);

drop policy if exists members_update_authenticated on public.members;
create policy members_update_authenticated
on public.members
for update
to authenticated
using (true)
with check (true);

drop policy if exists members_update_anon on public.members;
create policy members_update_anon
on public.members
for update
to anon
using (true)
with check (true);

drop policy if exists consents_select_authenticated on public.member_consents;
create policy consents_select_authenticated
on public.member_consents
for select
to authenticated
using (true);

drop policy if exists consents_select_anon on public.member_consents;
create policy consents_select_anon
on public.member_consents
for select
to anon
using (true);

drop policy if exists consents_insert_authenticated on public.member_consents;
create policy consents_insert_authenticated
on public.member_consents
for insert
to authenticated
with check (true);

drop policy if exists consents_insert_anon on public.member_consents;
create policy consents_insert_anon
on public.member_consents
for insert
to anon
with check (true);