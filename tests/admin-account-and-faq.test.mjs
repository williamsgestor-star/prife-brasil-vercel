import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin can create an account without prior self-registration", async () => {
  const editor = await read("app/painel/CompanyEditor.tsx");
  const edgeFunction = await read("supabase/functions/admin-create-account/index.ts");
  assert.match(editor, /Criar empresa e acesso/);
  assert.match(editor, /functions\.invoke\("admin-create-account"/);
  assert.match(edgeFunction, /is_current_user_admin/);
  assert.match(edgeFunction, /inviteUserByEmail/);
  assert.match(edgeFunction, /admin_create_tenant/);
});

test("FAQ content is editable and safely rendered", async () => {
  const editor = await read("app/painel/CompanyEditor.tsx");
  const app = await read("public/src/app.js");
  assert.match(editor, /faqTitleLine1/);
  assert.match(editor, /faqTitleLine1 \?\? defaultFaqTitleLine1/);
  assert.match(editor, /faqDescription \?\? defaultFaqDescription/);
  assert.match(editor, /A Prife é uma empresa internacional com um ecossistema/);
  assert.match(editor, /faqQuestion\$\{index \+ 1\}/);
  assert.match(editor, /faqAnswer\$\{index \+ 1\}/);
  assert.match(app, /escapeHtml\(faq\.line1\)/);
  assert.match(app, /escapeHtml\(question\)/);
  assert.match(app, /escapeHtml\(answer\)/);
});
