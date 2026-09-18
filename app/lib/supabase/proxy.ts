import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { billableSlug } from "../site-subscription";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const host = request.headers.get("host") || request.nextUrl.hostname;
  const slug = billableSlug(host);
  if (!url || !publishableKey) return slug ? unavailable(request, 503) : response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headersToSet).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  if (slug) {
    try {
      const { data, error } = await supabase.rpc("get_site_availability", { p_slug: slug })
        .abortSignal(AbortSignal.timeout(8000));
      if (error || data !== true) return unavailable(request, error ? 503 : 403);
    } catch { return unavailable(request, 503); }
  }
  await supabase.auth.getClaims();
  if (slug) response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

function unavailable(request: NextRequest, status: number) {
  const message = status === 503 ? "Não foi possível verificar a disponibilidade. Tente novamente em alguns instantes." : "Este site está temporariamente indisponível. Entre em contato com o responsável.";
  const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" };
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "site_unavailable", message }, { status, headers });
  return new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site indisponível | Prife Brasil</title></head><body style="margin:0;background:#03102b;color:#effaff;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center"><main style="max-width:520px;padding:32px"><h1>Site temporariamente indisponível</h1><p style="line-height:1.6">${message}</p></main></body></html>`, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
