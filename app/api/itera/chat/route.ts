import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../../lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 30;

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

export async function POST(request: NextRequest) {
  try {
    if (rateLimited(request)) {
      return NextResponse.json({ stored: false }, { status: 429, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const sessionId = String(body.sessionId ?? "");
    const language = ["pt", "es", "en"].includes(String(body.language)) ? String(body.language) : "pt";
    const visitorQuestion = sanitizeChatText(body.visitorQuestion, 300);
    const assistantAnswer = sanitizeChatText(body.assistantAnswer, 1800);
    const conversationContext = sanitizeChatText(body.conversationContext, 40) || null;

    if (!UUID_PATTERN.test(sessionId) || !visitorQuestion || !assistantAnswer) {
      return NextResponse.json({ stored: false }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("itera_chat_exchanges").insert({
      session_id: sessionId,
      tenant_slug: tenantSlugFromRequest(request),
      language,
      visitor_question: visitorQuestion,
      assistant_answer: assistantAnswer,
      conversation_context: conversationContext,
      show_whatsapp: Boolean(body.showWhatsApp),
    });

    if (error) return NextResponse.json({ stored: false }, { status: 503 });
    return NextResponse.json({ stored: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ stored: false }, { status: 400 });
  }
}
