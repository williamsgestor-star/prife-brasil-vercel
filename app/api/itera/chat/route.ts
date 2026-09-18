import { createHash } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  ITERA_ASSISTANT_SYSTEM_PROMPT,
  freeQuestionReply,
  type IteraReply,
} from "../../../lib/itera-assistant";
import type { IteraContext } from "../../../lib/itera-expertise";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_KEY_PATTERN = /^[A-Za-z0-9._~-]{32,180}$/;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 30;
const MAX_HISTORY_EXCHANGES = 12;

type Language = "pt" | "es" | "en";
type HistoryRow = {
  visitor_question: string;
  assistant_answer: string;
  conversation_context: string | null;
  show_whatsapp: boolean;
  created_at: string;
};

function rateLimited(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function tenantSlugFromRequest(request: NextRequest) {
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "prife-brasil.com";
  const host = rawHost.toLowerCase().split(":")[0].replace(/^www\./, "");
  if (host === "prife-brasil.com" || host.endsWith(".chatgpt.site")) return "williams";
  const suffix = ".prife-brasil.com";
  if (!host.endsWith(suffix)) return "williams";
  const slug = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : "williams";
}

function sanitizeChatText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-mail removido]")
    .replace(/(?:\+?\d[\s().-]*){8,}/g, "[telefone removido]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sessionHash(sessionKey: string) {
  return createHash("sha256").update(sessionKey).digest("hex");
}

function memoryClient(hash: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase não configurado.");
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-itera-session-hash": hash } },
  });
}

function localized(language: Language, pt: string, es: string, en: string) {
  return { pt, es, en }[language];
}

function normalizeContext(value: unknown): IteraContext | null {
  const context = sanitizeChatText(value, 40) as IteraContext;
  const allowed = new Set<IteraContext>([
    "prife", "business", "sales", "catalog", "iteracare", "iterabio", "biolite",
    "ionshield", "magnoseek", "glasses", "bracelet", "renew", "oxytap",
    "other-product", "pwg", "travel", "foundation",
  ]);
  return allowed.has(context) ? context : null;
}

async function loadHistory(
  request: NextRequest,
  sessionId: string,
  language: Language,
  hash: string,
) {
  const supabase = memoryClient(hash);
  const { data, error } = await supabase
    .from("itera_chat_exchanges")
    .select("visitor_question,assistant_answer,conversation_context,show_whatsapp,created_at")
    .eq("session_id", sessionId)
    .eq("tenant_slug", tenantSlugFromRequest(request))
    .eq("language", language)
    .eq("session_key_hash", hash)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_EXCHANGES);
  if (error) {
    console.error("iTERA memory read failed", { code: error.code });
    return [] as HistoryRow[];
  }
  return ((data || []) as HistoryRow[]).reverse();
}

function parseAiReply(raw: string, fallback: IteraReply, language: Language): IteraReply {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const text = sanitizeChatText(parsed.text, 1800);
    return {
      text: text || fallback.text,
      showWhatsApp: Boolean(fallback.showWhatsApp),
      focusQuestion: Boolean(parsed.focusQuestion ?? fallback.focusQuestion),
      context: normalizeContext(parsed.context) || fallback.context,
    };
  } catch {
    const text = sanitizeChatText(raw, 1800);
    return { ...fallback, text: text || fallback.text };
  }
}

async function aiReply(
  language: Language,
  question: string,
  fallback: IteraReply,
  history: HistoryRow[],
) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) return { reply: fallback, model: "rules-fallback" };

  const languageInstruction = localized(
    language,
    "Responda somente em português do Brasil.",
    "Responde solamente en español.",
    "Reply only in English.",
  );

  const recentConversation = history
    .flatMap((row) => [
      { role: "user", content: row.visitor_question },
      { role: "assistant", content: row.assistant_answer },
    ])
    .slice(-16);

  const grounding = [
    languageInstruction,
    "A resposta factual confirmada pela base local para esta pergunta é:",
    fallback.text,
    "Contexto confirmado: " + (fallback.context || "não definido"),
    "WhatsApp autorizado pela base: " + (fallback.showWhatsApp ? "sim" : "não"),
    "Use a conversa recente para entender pronomes e referências como 'ele', 'isso', 'este aparelho' e perguntas de continuação.",
    "Não crie fatos novos. Se a base confirmada não trouxer uma informação específica, diga que ela precisa ser confirmada com o consultor.",
    "Mantenha a resposta natural, acolhedora e objetiva; não repita automaticamente uma abertura comercial.",
    "Retorne SOMENTE JSON válido neste formato: {"text":"resposta","context":"iteracare ou outro contexto válido","focusQuestion":true}.",
  ].join("\n\n");

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          { role: "system", content: ITERA_ASSISTANT_SYSTEM_PROMPT },
          { role: "system", content: grounding },
          ...recentConversation,
          { role: "user", content: question },
        ],
        stream: false,
      }),
    });
    if (!response.ok) throw new Error("gateway_" + response.status);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("gateway_empty");
    return { reply: parseAiReply(raw, fallback, language), model: "openai/gpt-5.6-sol" };
  } catch (error) {
    console.error("iTERA AI gateway failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { reply: fallback, model: "rules-fallback" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get("sessionId") || "");
    const language = (["pt", "es", "en"].includes(String(url.searchParams.get("language")))
      ? String(url.searchParams.get("language"))
      : "pt") as Language;
    const sessionKey = String(request.headers.get("x-itera-session-key") || "");

    if (!UUID_PATTERN.test(sessionId) || !SESSION_KEY_PATTERN.test(sessionKey)) {
      return NextResponse.json({ messages: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const history = await loadHistory(request, sessionId, language, sessionHash(sessionKey));
    return NextResponse.json({
      messages: history.flatMap((row) => [
        { role: "visitor", text: row.visitor_question },
        { role: "assistant", text: row.assistant_answer, showWhatsApp: row.show_whatsapp },
      ]),
      context: history.length ? history[history.length - 1].conversation_context : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ messages: [] }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (rateLimited(request)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": "600", "Cache-Control": "no-store" } },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const sessionId = String(body.sessionId ?? "");
    const sessionKey = String(body.sessionKey ?? "");
    const language = (["pt", "es", "en"].includes(String(body.language)) ? String(body.language) : "pt") as Language;
    const visitorQuestion = sanitizeChatText(body.visitorQuestion, 300);
    const clientContext = normalizeContext(body.conversationContext);

    if (!UUID_PATTERN.test(sessionId) || !SESSION_KEY_PATTERN.test(sessionKey) || !visitorQuestion) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const hash = sessionHash(sessionKey);
    const history = await loadHistory(request, sessionId, language, hash);
    const previousContext =
      clientContext ||
      normalizeContext(history.length ? history[history.length - 1].conversation_context : null);

    const fallback = freeQuestionReply(visitorQuestion, language, previousContext);
    const generated = await aiReply(language, visitorQuestion, fallback, history);
    const reply = generated.reply;

    const supabase = memoryClient(hash);
    const { error } = await supabase.from("itera_chat_exchanges").insert({
      session_id: sessionId,
      session_key_hash: hash,
      tenant_slug: tenantSlugFromRequest(request),
      language,
      visitor_question: visitorQuestion,
      assistant_answer: sanitizeChatText(reply.text, 1800),
      conversation_context: reply.context || previousContext,
      show_whatsapp: Boolean(reply.showWhatsApp),
      knowledge_status: "pending",
    });

    if (error) {
      console.error("iTERA memory insert failed", { code: error.code });
    }

    return NextResponse.json({
      reply,
      model: generated.model,
      stored: !error,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "assistant_unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
