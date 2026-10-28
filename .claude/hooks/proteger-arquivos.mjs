#!/usr/bin/env node
// Hook PreToolUse (Edit|Write|MultiEdit): bloqueia alterações em arquivos sensíveis.
// Sai com código 2 para recusar a ação e explicar o motivo ao Claude.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(root, filePath);
const rel = path.relative(root, abs).split(path.sep).join("/");
const base = path.basename(abs);

function bloquear(motivo) {
  process.stderr.write(`Bloqueado: ${rel}. ${motivo}\n`);
  process.exit(2);
}

if (base.startsWith(".env")) {
  bloquear("Arquivos .env guardam segredos. Peça ao Williams para configurar a variável na Vercel ou no Supabase.");
}
if (base === "package-lock.json") {
  bloquear("O lockfile só muda via npm install/npm ci, nunca editado à mão.");
}
if (rel.startsWith("supabase/migrations/") && rel.endsWith(".sql") && existsSync(abs)) {
  bloquear("Esta migração já foi aplicada no banco. Crie uma nova com a skill /nova-migracao.");
}

process.exit(0);
