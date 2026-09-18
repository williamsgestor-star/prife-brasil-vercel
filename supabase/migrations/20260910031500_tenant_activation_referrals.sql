-- Cinco indicacoes por tenant para concessao da ativacao gratuita.
create table if not exists public.tenant_activation_referrals (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slot_number smallint not null check (slot_number between 1 and 5),
  referred_name text check (referred_name is null or char_length(btrim(referred_name)) between 1 and 160),
  referred_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, slot_number)
);

alter table public.tenant_activation_referrals enable row level security;

drop policy if exists "Platform admins can view activation referrals" on public.tenant_activation_referrals;
create policy "Platform admins can view activation referrals"
on public.tenant_activation_referrals for select to authenticated
using ((select private.is_platform_admin()));

drop policy if exists "Platform admins can create activation referrals" on public.tenant_activation_referrals;
create policy "Platform admins can create activation referrals"
on public.tenant_activation_referrals for insert to authenticated
with check ((select private.is_platform_admin()));

drop policy if exists "Platform admins can update activation referrals" on public.tenant_activation_referrals;
create policy "Platform admins can update activation referrals"
on public.tenant_activation_referrals for update to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

revoke all on table public.tenant_activation_referrals from public, anon;
grant select, insert, update on table public.tenant_activation_referrals to authenticated;

