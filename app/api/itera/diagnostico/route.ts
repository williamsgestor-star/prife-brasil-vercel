import { NextResponse } from "next/server";
import { groqModels } from "../../../lib/ai-chat";
import { RATE_RULES, checkRateLimit, tooManyRequests } from "../../../lib/rate-limit";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

// Diagnóstico da IA do assistente: confere se a chave do Groq existe e responde. Não mostra a chave.
// Só administradores podem usar: cada chamada gasta a chave da Groq.
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context?.isAdmin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const limit = await checkRateLimit(RATE_RULES.diagnosticoUser, String(context.claims.sub));
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, "Aguarde alguns minutos para rodar o diagnóstico de novo.");

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ groqKey: "ausente", ok: false }, { headers: { "Cache-Control": "no-store" } });
  const results: Array<{ model: string; status: number; ok: boolean; detail?: string }> = [];
  const models = await groqModels(key);
  for (const model of models.slice(0, 2)) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Responda só: ok" }], max_tokens: 5 }),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await response.text();
      results.push({ model, status: response.status, ok: response.ok, detail: response.ok ? undefined : text.slice(0, 300) });
    } catch (error) {
      results.push({ model, status: 0, ok: false, detail: error instanceof Error ? error.message : "erro" });
    }
  }
  return NextResponse.json({ groqKey: "presente", ok: results.some((r) => r.ok), results }, { headers: { "Cache-Control": "no-store" } });
}
