import test from 'node:test';
import assert from 'node:assert/strict';
import { freeQuestionReply, getIteraWelcomeMessage } from '../app/lib/itera-assistant.ts';

test('uses the requested single welcome sentence', () => {
  assert.equal(getIteraWelcomeMessage('pt'), 'Olá! Eu sou o Assistente iTERA. O que você quer conhecer?');
});

test('keeps the selected product context in a natural follow-up', () => {
  const first = freeQuestionReply('O que é o iTeraCare?', 'pt');
  assert.equal(first.context, 'iteracare');
  const followUp = freeQuestionReply('E como usar?', 'pt', first.context);
  assert.match(followUp.text, /iTeraCare/);
  assert.match(followUp.text, /manual oficial/);
});

test('asks for clarification instead of inventing an unrelated answer', () => {
  const result = freeQuestionReply('xyz sem contexto', 'pt');
  assert.match(result.text, /entender melhor sua pergunta/);
  assert.equal(result.focusQuestion, true);
});
