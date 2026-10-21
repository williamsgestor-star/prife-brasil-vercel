import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Batida diária (Vercel Cron, ver vercel.json): faz uma consulta leve ao Supabase
// para o projeto não ficar ocioso e mostra se o banco está respondendo.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const headers = { "Cache-Control": "no-store" };
  if (!url || !key) return NextResponse.json({ ok: false, database: "not_configured" }, { status: 503, headers });
  const started = Date.now();
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.rpc("get_site_availability", { p_slug: "williams" }).abortSignal(AbortSignal.timeout(8000));
    if (error) return NextResponse.json({ ok: false, database: "error" }, { status: 503, headers });
    return NextResponse.json({ ok: true, database: "up", ms: Date.now() - started }, { headers });
  } catch {
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503, headers });
  }
}
