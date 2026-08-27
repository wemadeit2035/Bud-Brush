-- BudBrush role-based access control.
-- Bootstrap the first admin only after this migration has run:
-- insert into public.user_roles (user_id, role) values ('<auth.users id>', 'admin');

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'staff')
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

alter table public.user_roles enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.members enable row level security;
alter table public.member_consents enable row level security;
alter table public.daily_sales_archive enable row level security;

do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'user_roles',
    'staff_accounts',
    'products',
    'transactions',
    'transaction_items',
    'members',
    'member_consents',
    'daily_sales_archive'
  ] loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', existing_policy.policyname, target_table);
    end loop;
  end loop;
end;
$$;

alter table public.products add column if not exists created_by text;
alter table public.products add column if not exists updated_by text;
alter table public.transactions add column if not exists created_by text;
alter table public.transactions add column if not exists updated_by text;

create or replace function public.set_actor_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid()::text;
  end if;
  new.updated_by := auth.uid()::text;
  return new;
end;
$$;

drop trigger if exists trg_members_actor_audit on public.members;
create trigger trg_members_actor_audit
before insert or update on public.members
for each row execute function public.set_actor_audit_fields();

drop trigger if exists trg_products_actor_audit on public.products;
create trigger trg_products_actor_audit
before insert or update on public.products
for each row execute function public.set_actor_audit_fields();

drop trigger if exists trg_transactions_actor_audit on public.transactions;
create trigger trg_transactions_actor_audit
before insert or update on public.transactions
for each row execute function public.set_actor_audit_fields();

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists user_roles_admin_read on public.user_roles;
create policy user_roles_admin_read on public.user_roles
for select to authenticated using (public.is_admin());

drop policy if exists staff_accounts_admin_read on public.staff_accounts;
create policy staff_accounts_admin_read on public.staff_accounts
for select to authenticated using (public.is_admin());

drop policy if exists staff_accounts_self_read on public.staff_accounts;
create policy staff_accounts_self_read on public.staff_accounts
for select to authenticated using (user_id = auth.uid());

drop policy if exists products_read_staff_or_admin on public.products;
create policy products_read_staff_or_admin on public.products
for select to authenticated using (public.is_staff_or_admin());

drop policy if exists products_write_admin on public.products;
create policy products_write_admin on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.adjust_product_stock(product_id text, new_stock integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff_or_admin() then
    raise exception 'Unauthorized';
  end if;

  if new_stock < 0 then
    raise exception 'Stock cannot be negative';
  end if;

  update public.products
  set stock = new_stock
  where id::text = product_id;

  if not found then
    raise exception 'Product not found';
  end if;
end;
$$;

grant execute on function public.adjust_product_stock(text, integer) to authenticated;

drop policy if exists transactions_read_staff_or_admin on public.transactions;
create policy transactions_read_staff_or_admin on public.transactions
for select to authenticated using (public.is_staff_or_admin());

drop policy if exists transactions_insert_staff_or_admin on public.transactions;
create policy transactions_insert_staff_or_admin on public.transactions
for insert to authenticated with check (public.is_staff_or_admin());

drop policy if exists transactions_change_staff_or_admin on public.transactions;
create policy transactions_change_staff_or_admin on public.transactions
for update to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists transactions_delete_admin on public.transactions;
create policy transactions_delete_admin on public.transactions
for delete to authenticated using (public.is_admin());

drop policy if exists transaction_items_read_staff_or_admin on public.transaction_items;
create policy transaction_items_read_staff_or_admin on public.transaction_items
for select to authenticated using (public.is_staff_or_admin());

drop policy if exists transaction_items_insert_staff_or_admin on public.transaction_items;
create policy transaction_items_insert_staff_or_admin on public.transaction_items
for insert to authenticated with check (public.is_staff_or_admin());

drop policy if exists transaction_items_change_staff_or_admin on public.transaction_items;
create policy transaction_items_change_staff_or_admin on public.transaction_items
for update to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists transaction_items_delete_staff_or_admin on public.transaction_items;
create policy transaction_items_delete_staff_or_admin on public.transaction_items
for delete to authenticated using (public.is_staff_or_admin());

drop policy if exists members_select_authenticated on public.members;
drop policy if exists members_select_anon on public.members;
drop policy if exists members_insert_authenticated on public.members;
drop policy if exists members_insert_anon on public.members;
drop policy if exists members_update_authenticated on public.members;
drop policy if exists members_update_anon on public.members;
drop policy if exists members_delete_authenticated on public.members;
drop policy if exists members_delete_anon on public.members;
drop policy if exists members_read_staff_or_admin on public.members;
create policy members_read_staff_or_admin on public.members
for select to authenticated using (public.is_staff_or_admin());

drop policy if exists members_write_staff_or_admin on public.members;
create policy members_write_staff_or_admin on public.members
for insert to authenticated with check (public.is_staff_or_admin());

drop policy if exists members_update_staff_or_admin on public.members;
create policy members_update_staff_or_admin on public.members
for update to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists members_delete_admin on public.members;
create policy members_delete_admin on public.members
for delete to authenticated using (public.is_admin());

drop policy if exists consents_select_authenticated on public.member_consents;
drop policy if exists consents_select_anon on public.member_consents;
drop policy if exists consents_insert_authenticated on public.member_consents;
drop policy if exists consents_insert_anon on public.member_consents;
drop policy if exists consents_delete_authenticated on public.member_consents;
drop policy if exists consents_delete_anon on public.member_consents;
drop policy if exists consents_read_staff_or_admin on public.member_consents;
create policy consents_read_staff_or_admin on public.member_consents
for select to authenticated using (public.is_staff_or_admin());

drop policy if exists consents_write_staff_or_admin on public.member_consents;
create policy consents_write_staff_or_admin on public.member_consents
for insert to authenticated with check (public.is_staff_or_admin());

drop policy if exists consents_delete_admin on public.member_consents;
create policy consents_delete_admin on public.member_consents
for delete to authenticated using (public.is_admin());

drop policy if exists archives_read_admin on public.daily_sales_archive;
create policy archives_read_admin on public.daily_sales_archive
for select to authenticated using (public.is_admin());

drop policy if exists archives_write_admin on public.daily_sales_archive;
create policy archives_write_admin on public.daily_sales_archive
for all to authenticated using (public.is_admin()) with check (public.is_admin());