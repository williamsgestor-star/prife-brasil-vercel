import test from 'node:test';
import assert from 'node:assert/strict';
import { billableSlug, isSubscriptionInactive, subscriptionStatus } from '../app/lib/site-subscription.ts';

test('only subdomains are subject to billing, including www aliases', () => {
  for (const host of ['prife-brasil.com', 'www.prife-brasil.com', 'prife-brasil-final-qa.grupo-costa-3856.chatgpt.site', 'terminal.local:4173']) assert.equal(billableSlug(host), null);
  assert.equal(billableSlug('damasceno.prife-brasil.com'), 'damasceno');
  assert.equal(billableSlug('www.damasceno.prife-brasil.com'), 'damasceno');
  assert.equal(billableSlug('williams.prife-brasil.com'), 'williams');
  assert.equal(billableSlug('bad.extra.prife-brasil.com'), null);
});

test('countdown distinguishes disabled, future, expired and unconfigured cycles', () => {
  const now = Date.parse('2026-09-09T03:00:00Z');
  assert.equal(subscriptionStatus(null,now), 'Ativo · prazo não definido');
  assert.equal(subscriptionStatus({enabled:false},now), 'Bloqueado manualmente');
  assert.equal(subscriptionStatus({enabled:true,started_at:'2026-09-10T03:00:00Z',expires_at:'2026-10-10T03:00:00Z'},now), 'Ativo · ciclo futuro');
  assert.equal(subscriptionStatus({enabled:true,started_at:'2026-08-10T03:00:00Z',expires_at:'2026-09-09T03:00:00Z'},now), 'Bloqueado · mensalidade vencida');
  assert.equal(subscriptionStatus({enabled:true,started_at:'2026-09-09T03:00:00Z',expires_at:'2026-10-09T03:00:00Z'},now), 'Ativo · 30d 0h 0min restantes');
  assert.equal(isSubscriptionInactive(null, now), false);
  assert.equal(isSubscriptionInactive({enabled:false}, now), true);
  assert.equal(isSubscriptionInactive({enabled:true,expires_at:'2026-09-09T03:00:00Z'}, now), true);
  assert.equal(isSubscriptionInactive({enabled:true,expires_at:'2026-10-09T03:00:00Z'}, now), false);
});
