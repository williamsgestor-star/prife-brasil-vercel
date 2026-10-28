#!/usr/bin/env node
// Hook PostToolUse (Edit|Write|MultiEdit): roda o ESLint no arquivo que acabou de ser alterado.
// Se houver erro, sai com código 2 para o Claude ver a saída e corrigir.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !/\.(ts|tsx|js|jsx|mjs)$/.test(filePath)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(root, filePath);
const rel = path.relative(root, abs);
if (rel.startsWith("..") || rel.split(path.sep)[0] === "node_modules" || !existsSync(abs)) process.exit(0);

const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
if (!existsSync(eslintBin)) process.exit(0); // dependências não instaladas: não atrapalha

const result = spawnSync(process.execPath, [eslintBin, "--no-warn-ignored", rel], {
  cwd: root,
  encoding: "utf8",
  timeout: 60000,
});

if (result.status === 1) {
  process.stderr.write(`ESLint encontrou problemas em ${rel}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
process.exit(0);
