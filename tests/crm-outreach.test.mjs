import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutreach } from '../app/lib/crm-outreach.ts';
const lead = { company_name: 'Pet Shop Área 3', segment: 'Veterinário' };
test('first contact uses seller intent, sender and company without inventing veterinary use', () => {
  const r = createOutreach('pt','first',lead,'quero vender aparelho Iteracare','Williams');
  assert.match(r.message,/equipe da Pet Shop Área 3/);
  assert.match(r.message,/Sou Williams/);
  assert.match(r.message,/iTeraCare/);
  assert.match(r.message,/não de aplicação em animais/);
  assert.doesNotMatch(r.message,/quero vender aparelho|Vi que você atua/);
});
test('context changes offer and length; explicit offer wins', () => {
  const full=createOutreach('pt','first',lead,'vender Bio Lite','Williams');
  const short=createOutreach('pt','first',lead,'vender Bio Lite curto','Williams');
  assert.match(full.message,/iTera-Bio Lite/);
  assert.ok(short.message.length < full.message.length);
  assert.match(createOutreach('pt','first',lead,'vender Bio Lite','Williams','iON Shield').message,/iON Shield/);
});
test('all eight products and a custom editable product are supported', () => {
  const products = ['iTeraCare Classic Plus','Vitality Energy','Envy Sun','iTera-Bio Lite','Renew Patch','Envy Specs','MagnoSeek','iON Shield'];
  for (const product of products) assert.ok(createOutreach('pt','first',lead,'','Williams',product).message.includes(product));
  assert.match(createOutreach('pt','first',lead,'','Williams','Produto Especial X').message,/Produto Especial X/);
});
test('objections receive distinct useful replies and opt out overrides sales goals', () => {
  assert.match(createOutreach('pt','objection',lead,'achou caro','Williams').message,/valor total ou a forma de pagamento/);
  assert.match(createOutreach('pt','objection',lead,'sem tempo','Williams').message,/resumo curto/);
  assert.match(createOutreach('pt','closing',lead,'não tem interesse','Williams').message,/Não vou insistir/);
});
test('languages and stages retain product specificity, no fabricated prior statements', () => {
  for (const lang of ['pt','es','en']) {
    for (const mode of ['first','followup','objection','closing']) {
      const r=createOutreach(lang,mode,lead,'iON Shield','Williams');
      assert.match(r.message,/iON Shield/);
      assert.ok(r.tip && r.limits);
    }
  }
});
test('answers a customer product question directly instead of generating a cold pitch', () => {
  const result = createOutreach('pt', 'first', lead, 'a pessoa me perguntou sobre o iteracare o que eu falo?', 'Williams');
  assert.match(result.message, /aparelho de bem-estar para uso externo/);
  assert.match(result.message, /não é equipamento médico/);
  assert.doesNotMatch(result.message, /Meu contato é para apresentar/);
  assert.doesNotMatch(result.message, /Sou Williams/);
});

test('direct-answer intent works in all languages and respects the selected product', () => {
  const cases = [
    ['pt', 'a pessoa me perguntou sobre o produto, como respondo?'],
    ['es', 'me preguntó sobre el producto, ¿cómo respondo?'],
    ['en', 'the customer asked me about it, what should I say?'],
  ];
  for (const [language, context] of cases) {
    const result = createOutreach(language, 'first', lead, context, 'Williams', 'iON Shield');
    assert.match(result.message, /iON Shield/);
    assert.doesNotMatch(result.message, /Williams/);
  }
});
