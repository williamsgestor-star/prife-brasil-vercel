import { createHash } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Limite de requisições (rate limit) compartilhado pelas rotas da API.
// A contagem fica no Supabase (função public.api_rate_limit_hit), então vale para todas as
// instâncias da Vercel ao mesmo tempo. Se a função ainda não existir ou o banco demorar,
// cai para uma contagem em memória: a rota nunca fica fora do ar por causa do limitador.
// As chaves (e-mail, IP, usuário) são gravadas só como hash, nunca em texto puro.

export type RateRule = {
  /** Nome curto da regra, ex.: "otp-email". Vira prefixo da chave. */
  name: string;
  /** Máximo de requisições permitidas dentro da janela. */
  max: number;
  /** Tamanho da janela em segundos. */
  windowSeconds: number;
};

export type RateResult = { allowed: boolean; retryAfter: number };

const memory = new Map<string, { count: number; resetAt: number }>();
const RPC_TIMEOUT_MS = 1500;

function hashKey(rule: RateRule, identity: string) {
  const digest = createHash("sha256").update(`${rule.name}:${identity.trim().toLowerCase()}`).digest("hex");
  return `${rule.name}:${digest.slice(0, 40)}`;
}

function memoryHit(key: string, rule: RateRule): RateResult {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt <= now) {
    if (memory.size > 10_000) memory.clear();
    memory.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= rule.max,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

async function databaseHit(key: string, rule: RateRule): Promise<RateResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  try {
    const supabase = createSupabaseClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase
      .rpc("api_rate_limit_hit", { p_key: key, p_max: rule.max, p_window_seconds: rule.windowSeconds })
      .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: unknown; retry_after?: unknown } | null;
    if (!row || typeof row.allowed !== "boolean") return null;
    return { allowed: row.allowed, retryAfter: row.allowed ? 0 : Math.max(1, Number(row.retry_after) || rule.windowSeconds) };
  } catch {
    return null;
  }
}

/** Conta uma requisição para `identity` na regra e diz se ela pode seguir. */
export async function checkRateLimit(rule: RateRule, identity: string): Promise<RateResult> {
  const key = hashKey(rule, identity || "desconhecido");
  const local = memoryHit(key, rule);
  const shared = await databaseHit(key, rule);
  if (!shared) return local;
  if (!local.allowed) return { allowed: false, retryAfter: Math.max(local.retryAfter, shared.retryAfter) };
  return shared;
}

/** Confere várias regras em sequência; para na primeira que estourar. */
export async function checkRateLimits(checks: Array<[RateRule, string]>): Promise<RateResult> {
  for (const [rule, identity] of checks) {
    const result = await checkRateLimit(rule, identity);
    if (!result.allowed) return result;
  }
  return { allowed: true, retryAfter: 0 };
}

/** IP do visitante. Na Vercel esses cabeçalhos são preenchidos pela própria plataforma. */
export function clientIp(request: Request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "desconhecido";
}

/** Resposta 429 padrão, com Retry-After em segundos. */
export function tooManyRequests(retryAfter: number, message = "Muitas tentativas. Aguarde um pouco e tente novamente.", extra: Record<string, unknown> = {}) {
  const seconds = Math.max(1, Math.ceil(retryAfter));
  return NextResponse.json(
    { error: message, retryAfter: seconds, ...extra },
    { status: 429, headers: { "Retry-After": String(seconds), "Cache-Control": "no-store" } },
  );
}

/** Regras de cada rota, num lugar só para facilitar ajustes. */
export const RATE_RULES = {
  otpIp: { name: "otp-ip", max: 10, windowSeconds: 60 * 60 },
  otpEmail: { name: "otp-email", max: 5, windowSeconds: 60 * 60 },
  verifyIp: { name: "verify-ip", max: 20, windowSeconds: 15 * 60 },
  verifyEmail: { name: "verify-email", max: 5, windowSeconds: 15 * 60 },
  meetingIp: { name: "meeting-ip", max: 10, windowSeconds: 15 * 60 },
  accessRequestUser: { name: "access-request", max: 5, windowSeconds: 60 * 60 },
  iteraChatIp: { name: "itera-chat-ip", max: 30, windowSeconds: 10 * 60 },
  crmAssistantUser: { name: "crm-assistant", max: 20, windowSeconds: 5 * 60 },
  leadsUser: { name: "leads-user", max: 8, windowSeconds: 10 * 60 },
  diagnosticoUser: { name: "itera-diagnostico", max: 5, windowSeconds: 10 * 60 },
} satisfies Record<string, RateRule>;
