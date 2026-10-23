import { NextResponse } from "next/server";

// Diagnóstico da IA do assistente: confere se a chave do Groq existe e responde. Não mostra a chave.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ groqKey: "ausente", ok: false }, { headers: { "Cache-Control": "no-store" } });
  const results: Array<{ model: string; status: number; ok: boolean; detail?: string }> = [];
  for (const model of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
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
  return NextResponse.json({ groqKey: `presente (${key.length} caracteres, começa com ${key.slice(0, 4)}…)`, ok: results.some((r) => r.ok), results }, { headers: { "Cache-Control": "no-store" } });
}
