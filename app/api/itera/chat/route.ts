import { createHash } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  ITERA_ASSISTANT_SYSTEM_PROMPT,
  freeQuestionReply,
  type IteraReply,
} from "../../../lib/itera-assistant";
import { callChatModel, customerPriceList, type ChatMessage } from "../../../lib/ai-chat";
import type { IteraContext } from "../../../lib/itera-expertise";
import { PRODUCT_MATERIALS, materialsFor } from "../../../lib/itera-materials";
import { RATE_RULES, checkRateLimit, clientIp, tooManyRequests } from "../../../lib/rate-limit";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_KEY_PATTERN = /^[A-Za-z0-9._~-]{32,180}$/;
const MAX_HISTORY_EXCHANGES = 12;

type Language = "pt" | "es" | "en";
type HistoryRow = {
  visitor_question: string;
  assistant_answer: string;
  conversation_context: string | null;
  show_whatsapp: boolean;
  created_at: string;
};


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

function parseAiReply(raw: string, fallback: IteraReply): IteraReply {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const text = sanitizeChatText(parsed.text, 1800);
    return {
      text: text || fallback.text,
      showWhatsApp: Boolean(parsed.showWhatsApp) || Boolean(fallback.showWhatsApp),
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
  const languageInstruction = localized(
    language,
    "Responda somente em português do Brasil.",
    "Responde solamente en español.",
    "Reply only in English.",
  );

  const recentConversation: ChatMessage[] = history
    .flatMap((row) => [
      { role: "user" as const, content: row.visitor_question },
      { role: "assistant" as const, content: row.assistant_answer },
    ])
    .slice(-16);

  const previousQuestions = history.map((row) => row.visitor_question);
  const materials = materialsFor(question, previousQuestions, fallback.context || null);
  const grounding = [
    languageInstruction,
    "MATERIAL OFICIAL DOS PRODUTOS (extraído dos PDFs da Prife; é a FONTE PRINCIPAL. Responda com os fatos concretos daqui: o que é, como funciona, recursos, modo de uso, cuidados e o que o material apresenta como benefício):",
    materials,
    "Como falar dos benefícios: diga que 'o material da Prife apresenta' ou 'associa ao uso', sem prometer cura ou resultado. Só traga o aviso de que não substitui profissional de saúde quando a pessoa falar de doença, sintoma, remédio ou tratamento, ou no máximo uma vez na conversa; não repita esse aviso em toda resposta.",
    "RESPOSTA-PADRÃO DO SITE (apoio secundário; use só o que ajudar, não copie):",
    fallback.text,
    "Contexto atual da conversa: " + (fallback.context || "não definido"),
    "LISTA DE PREÇOS AO CLIENTE (PRIFE Brasil). Use apenas estes valores quando perguntarem preço, sempre avisando que podem mudar e que frete, pagamento e disponibilidade são confirmados com o consultor:",
    customerPriceList(),
    "Quando a pessoa perguntar como funciona, o que faz, benefícios, como usar ou diferença entre modelos, explique de verdade com os dados do material (até 90 palavras, pode usar 2 parágrafos curtos). Nas demais, converse de forma natural e humana, como um consultor atencioso no WhatsApp: mensagens curtas (1 a 3 frases), reaja com as palavras da pessoa, responda exatamente o que foi perguntado, use a conversa recente para entender referências ('ele', 'isso', 'esse aparelho'), não repita perguntas já respondidas nem a mesma abertura comercial. A base acima é só fonte de fatos: resuma o essencial, não copie listas inteiras.",
    "Se faltar uma informação específica na base, diga com transparência que o consultor confirma.",
    "Marque showWhatsApp como true quando a pessoa quiser comprar, saber preço/condições, se cadastrar, ser distribuidora ou falar com alguém.",
    'Retorne SOMENTE JSON válido: {"text":"resposta para o visitante","context":"prife|business|sales|catalog|iteracare|iterabio|biolite|ionshield|magnoseek|glasses|bracelet|renew|oxytap|other-product|pwg|travel|foundation","focusQuestion":true,"showWhatsApp":false}.',
  ].join("\n\n");

  const result = await callChatModel([
    { role: "system", content: ITERA_ASSISTANT_SYSTEM_PROMPT },
    { role: "system", content: grounding },
    ...recentConversation,
    { role: "user", content: question },
  ]);
  if (!result) {
    // Sem IA: se a pergunta é sobre um produto, responde com o resumo do material em vez do texto genérico.
    const hit = PRODUCT_MATERIALS.find((m) => m.match.test(question)) || PRODUCT_MATERIALS.find((m) => m.match.test(previousQuestions.slice(-3).join(" ")));
    if (hit && language === "pt") {
      const summary = hit.text.split("\n")[0].slice(0, 700);
      return { reply: { ...fallback, text: `${summary}\n\nQuer saber o modo de uso, os cuidados ou o valor?` }, model: "materials-fallback" };
    }
    return { reply: fallback, model: "rules-fallback" };
  }
  return { reply: parseAiReply(result.raw, fallback), model: result.model };
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
    const limit = await checkRateLimit(RATE_RULES.iteraChatIp, clientIp(request));
    if (!limit.allowed) return tooManyRequests(limit.retryAfter, "rate_limited");

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
