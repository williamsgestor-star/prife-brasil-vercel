import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('billing migrations enforce tenant access, payment plans and duplicate protection', async () => {
  const sql = await read('supabase/migrations/20260909111000_tenant_billing_and_site_access.sql');
  const plans = await read('supabase/migrations/20260910010258_tenant_payment_plans_and_duplicate_guard.sql');
  assert.match(sql, /activation_fee numeric\(10,2\).*500\.00/s);
  assert.match(sql, /monthly_fee numeric\(10,2\).*29\.90/s);
  assert.match(sql, /billing_due_at.*interval '30 days'/s);
  assert.match(sql, /admin_set_tenant_site_enabled/);
  assert.match(sql, /admin_mark_tenant_monthly_paid/);
  assert.match(sql, /billing_due_at = greatest\(billing_due_at, now\(\)\) \+ interval '30 days'/);
  assert.match(sql, /t\.site_enabled = true/);
  assert.match(sql, /t\.billing_exempt = true or t\.billing_due_at >= now\(\)/);
  assert.match(plans, /admin_register_tenant_payment/);
  assert.match(plans, /when 'monthly'.*29\.90/s);
  assert.match(plans, /when 'semiannual'.*150\.00/s);
  assert.match(plans, /when 'annual'.*300\.00/s);
  assert.match(plans, /tenant_subscription_one_payment_per_day/);
  assert.match(plans, /payment_already_registered_today/);
});

test('protected tools reject disabled or expired tenants', async () => {
  const access = await read('app/lib/supabase/access.ts');
  const leads = await read('app/api/leads/route.ts');
  assert.match(access, /billingExpired/);
  assert.match(access, /!tenant\.site_enabled \|\| billingExpired/);
  assert.match(access, /redirect\("\/acesso-indisponivel"\)/);
  assert.match(leads, /!tenant\.site_enabled \|\| billingExpired/);
  assert.match(leads, /temporariamente bloqueado/);
});

test('public tenant page never falls back to Williams for a valid blocked tenant lookup', async () => {
  const tenantSite = await read('app/lib/tenant-site.ts');
  const page = await read('app/page.tsx');
  assert.match(tenantSite, /unavailable: !profile/);
  assert.match(tenantSite, /lookupFailed: true/);
  assert.match(page, /if \(resolution\.unavailable\)/);
  assert.match(page, /Site temporariamente indisponível/);
});

test('admin panel exposes status, countdown and configured prices per tenant', async () => {
  const panel = await read('app/painel/SubscriptionPanel.tsx');
  const admin = await read('app/admin/empresas/page.tsx');
  assert.match(panel, /Ativação · pagamento único/);
  assert.match(panel, /R\$ 500,00/);
  assert.match(panel, /title: "Mensal"/);
  assert.match(panel, /Semestral/);
  assert.match(panel, /R\$ 150,00/);
  assert.match(panel, /Anual/);
  assert.match(panel, /R\$ 300,00/);
  assert.match(panel, /somente um registro por subdomínio a cada dia/);
  assert.match(panel, /bloqueado automaticamente/);
  assert.match(admin, /billing_started_at/);
  assert.match(admin, /billing_due_at/);
});
