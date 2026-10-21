-- Cortesia: o administrador prorroga o prazo de um subdominio sem registrar pagamento.
-- Fica gravado em tenant_site_subscription_events com action = 'courtesy' (quem, quando e quantos dias).
-- Pode ser executado mais de uma vez com seguranca.

create or replace function billing_internal.admin_extend_tenant_courtesy(
  p_tenant_id uuid,
  p_days integer
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_expiry timestamptz;
  result public.tenants;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'invalid_courtesy_days';
  end if;

  select * into result from public.tenants where id = p_tenant_id for update;
  if result.id is null then raise exception 'tenant_not_found'; end if;

  previous_expiry := result.billing_due_at;

  update public.tenants
     set billing_due_at = greatest(billing_due_at, now()) + make_interval(days => p_days),
         site_enabled = true,
         updated_at = now()
   where id = p_tenant_id
  returning * into result;

  insert into public.tenant_site_subscription_events (
    tenant_id, actor_id, action, previous_expires_at, expires_at
  ) values (
    p_tenant_id, auth.uid(), 'courtesy', previous_expiry, result.billing_due_at
  );

  return result;
end;
$$;

revoke all on function billing_internal.admin_extend_tenant_courtesy(uuid, integer) from public, anon, authenticated;
grant execute on function billing_internal.admin_extend_tenant_courtesy(uuid, integer) to authenticated;

create or replace function public.admin_extend_tenant_courtesy(p_tenant_id uuid, p_days integer)
returns public.tenants
language sql
security invoker
set search_path = ''
as $$
  select billing_internal.admin_extend_tenant_courtesy(p_tenant_id, p_days);
$$;

revoke all on function public.admin_extend_tenant_courtesy(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_extend_tenant_courtesy(uuid, integer) to authenticated;
