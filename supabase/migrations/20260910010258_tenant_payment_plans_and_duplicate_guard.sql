-- Planos de pagamento do site e protecao contra registro duplicado no mesmo dia.
alter table public.tenant_site_subscription_events
  add column if not exists payment_plan text,
  add column if not exists payment_amount numeric(10,2),
  add column if not exists request_id uuid,
  add column if not exists payment_day date;

alter table public.tenant_site_subscription_events
  drop constraint if exists tenant_site_subscription_events_payment_plan_check;

alter table public.tenant_site_subscription_events
  add constraint tenant_site_subscription_events_payment_plan_check
  check (payment_plan is null or payment_plan in ('monthly', 'semiannual', 'annual'));

create unique index if not exists tenant_subscription_events_request_id_unique
  on public.tenant_site_subscription_events(request_id)
  where request_id is not null;

create unique index if not exists tenant_subscription_one_payment_per_day
  on public.tenant_site_subscription_events(tenant_id, payment_day)
  where action = 'payment';

create or replace function billing_internal.admin_register_tenant_payment(
  p_tenant_id uuid,
  p_plan text,
  p_request_id uuid
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_plan text := lower(trim(coalesce(p_plan, '')));
  extension interval;
  amount numeric(10,2);
  payment_date date := (now() at time zone 'America/Asuncion')::date;
  previous_expiry timestamptz;
  result public.tenants;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;
  if p_request_id is null then raise exception 'payment_request_id_required'; end if;

  case normalized_plan
    when 'monthly' then extension := interval '30 days'; amount := 29.90;
    when 'semiannual' then extension := interval '6 months'; amount := 150.00;
    when 'annual' then extension := interval '12 months'; amount := 300.00;
    else raise exception 'invalid_payment_plan';
  end case;

  select * into result
  from public.tenants
  where id = p_tenant_id
  for update;

  if result.id is null then raise exception 'tenant_not_found'; end if;
  if result.billing_exempt then raise exception 'tenant_billing_exempt'; end if;

  if exists (
    select 1
    from public.tenant_site_subscription_events
    where tenant_id = p_tenant_id
      and action = 'payment'
      and payment_day = payment_date
  ) then
    raise exception 'payment_already_registered_today';
  end if;

  previous_expiry := result.billing_due_at;

  update public.tenants
     set last_payment_at = now(),
         billing_due_at = greatest(billing_due_at, now()) + extension,
         site_enabled = true,
         updated_at = now()
   where id = p_tenant_id
  returning * into result;

  insert into public.tenant_site_subscription_events (
    tenant_id, actor_id, action, previous_expires_at, expires_at,
    payment_plan, payment_amount, request_id, payment_day
  ) values (
    p_tenant_id, auth.uid(), 'payment', previous_expiry, result.billing_due_at,
    normalized_plan, amount, p_request_id, payment_date
  );

  return result;
end;
$$;

revoke all on function billing_internal.admin_register_tenant_payment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function billing_internal.admin_register_tenant_payment(uuid, text, uuid) to authenticated;

create or replace function public.admin_register_tenant_payment(
  p_tenant_id uuid,
  p_plan text,
  p_request_id uuid
)
returns public.tenants
language sql
security invoker
set search_path = ''
as $$
  select billing_internal.admin_register_tenant_payment(p_tenant_id, p_plan, p_request_id);
$$;

revoke all on function public.admin_register_tenant_payment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_register_tenant_payment(uuid, text, uuid) to authenticated;

-- Mantem compatibilidade durante a publicacao, com a mesma protecao diaria.
create or replace function public.admin_mark_tenant_monthly_paid(p_tenant_id uuid)
returns public.tenants
language sql
security invoker
set search_path = ''
as $$
  select public.admin_register_tenant_payment(p_tenant_id, 'monthly', gen_random_uuid());
$$;

revoke all on function public.admin_mark_tenant_monthly_paid(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_tenant_monthly_paid(uuid) to authenticated;

-- Reinicio solicitado: remove pagamentos anteriores e volta cada subdominio
-- cobrado ao primeiro ciclo de 30 dias contado de sua ativacao original.
delete from public.tenant_site_subscription_events
where action = 'payment'
  and tenant_id in (
    select id from public.tenants
    where slug in ('damasceno', 'silvanoleopoldo', 'roseliwagner', 'darci')
  );

update public.tenants
   set last_payment_at = null,
       billing_due_at = billing_started_at + interval '30 days',
       site_enabled = true,
       updated_at = now()
 where slug in ('damasceno', 'silvanoleopoldo', 'roseliwagner', 'darci')
   and billing_exempt = false;
