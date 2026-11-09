import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Google Analytics só carrega depois do Aceitar no aviso de cookies', async () => {
  const layout = await read('app/layout.tsx');
  const consent = await read('app/components/CookieConsent.tsx');
  const spa = await read('public/src/app.js');
  assert.doesNotMatch(layout, /<GoogleAnalytics/);
  assert.match(layout, /<CookieConsent measurementId=/);
  assert.match(consent, /choice === "accepted" && <GoogleAnalytics/);
  assert.match(consent, /decide\("rejected"\)/);
  assert.match(spa, /function trackEvent\(eventName, details = \{\}\) \{\n  if \(!analyticsConsented\(\)\) return;/);
  assert.match(spa, /youtube-nocookie\.com\/embed/);
});

test('rodapé tem política, termos e preferências de cookies', async () => {
  const spa = await read('public/src/app.js');
  const capture = await read('app/components/CapturePage.tsx');
  for (const source of [spa, capture]) {
    assert.match(source, /href="\/privacidade"/);
    assert.match(source, /href="\/termos"/);
    assert.match(source, /data-cookie-preferences/);
  }
});

test('política e termos cobrem prazo de guarda, incidente, direitos e arrependimento', async () => {
  const texts = await read('app/lib/legal-texts.ts');
  assert.match(texts, /Última atualização: \$\{LEGAL_UPDATED_AT\}/);
  assert.match(texts, /LEGAL_UPDATED_AT = "08\/11\/2026"/);
  assert.match(texts, /até 12 meses/);
  assert.match(texts, /Resolução CD\/ANPD nº 15\/2024/);
  assert.match(texts, /art\. 18 da LGPD/);
  assert.match(texts, /art\. 49 do Código de Defesa do Consumidor/);
  assert.match(texts, /Não há renovação automática/);
});

test('solicitação de acesso exige aceite não pré-marcado e grava a prova', async () => {
  const form = await read('app/aguardando-aprovacao/AccessRequestForm.tsx');
  const route = await read('app/api/access-request/route.ts');
  assert.match(form, /useState\(false\);\n  const \[acceptMarketing, setAcceptMarketing\] = useState\(false\);/);
  assert.match(route, /body\?\.acceptTerms !== true/);
  assert.match(route, /from\("legal_acceptances"\)/);
  assert.match(route, /document: "marketing"/);
});

test('lista de bloqueio impede o Prospector e a importação de trazer o contato de volta', async () => {
  const sql = await read('supabase/migrations/20261109003738_lgpd_aceites_e_lista_de_bloqueio.sql');
  const prospector = await read('app/api/leads/route.ts');
  const importer = await read('app/api/crm/leads/route.ts');
  const blockRoute = await read('app/api/crm/blocklist/route.ts');
  assert.match(sql, /alter table public\.crm_contact_blocklist enable row level security/);
  assert.match(sql, /alter table public\.legal_acceptances enable row level security/);
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /\bdrop table\b|\bdelete from\b|\btruncate\b/i);
  assert.match(prospector, /withoutBlockedPhones\(user\.supabase/);
  assert.match(importer, /withoutBlockedPhones\(resolved\.context\.supabase/);
  assert.match(blockRoute, /\.eq\("tenant_id", tenantId\)/);
});
