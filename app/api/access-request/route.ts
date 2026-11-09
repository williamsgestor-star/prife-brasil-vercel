import { NextResponse } from "next/server";

import { isMissingTableError } from "../../lib/contact-blocklist";
import { ACCEPT_MARKETING_TEXT, ACCEPT_TERMS_TEXT, PRIVACY_VERSION, TERMS_VERSION } from "../../lib/legal-texts";
import { getAuthenticatedContext } from "../../lib/supabase/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }

    const context = await getAuthenticatedContext();
    if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });

    const body = await request.json().catch(() => null) as {
      fullName?: unknown;
      business?: unknown;
      slug?: unknown;
      acceptTerms?: unknown;
      acceptMarketing?: unknown;
    } | null;
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const business = typeof body?.business === "string" ? body.business.trim() : "";
    const slug = typeof body?.slug === "string"
      ? body.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
      : "";

    if (!fullName || !business || !slug || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      return NextResponse.json({ error: "Confira o nome, a empresa e o subdomínio." }, { status: 400 });
    }

    if (body?.acceptTerms !== true) {
      return NextResponse.json({ error: "Para enviar, aceite os Termos de uso e a Política de Privacidade." }, { status: 400 });
    }

    // Prova do aceite (LGPD art. 8º): data/hora, versão, texto exato, origem. Marketing fica separado e é opcional.
    const origin = (request.headers.get("origin") || new URL(request.url).origin).slice(0, 200);
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 500) || null;
    const userEmail = typeof context.claims.email === "string" ? context.claims.email.slice(0, 320) : null;
    const acceptanceRows = [
      { document: "termos_privacidade", version: `${TERMS_VERSION}+${PRIVACY_VERSION}`, accepted: true, accepted_text: ACCEPT_TERMS_TEXT },
      { document: "marketing", version: TERMS_VERSION, accepted: body.acceptMarketing === true, accepted_text: ACCEPT_MARKETING_TEXT },
    ].map((row) => ({ ...row, user_id: context.claims.sub, user_email: userEmail, origin: `${origin}/aguardando-aprovacao`, user_agent: userAgent }));
    const { error: acceptanceError } = await context.supabase
      .from("legal_acceptances")
      .insert(acceptanceRows)
      .abortSignal(AbortSignal.timeout(15_000));
    if (acceptanceError && !isMissingTableError(acceptanceError)) {
      console.error("[access-request/acceptance] rejected", { code: acceptanceError.code });
      return NextResponse.json({ error: "Não foi possível registrar o aceite. Tente novamente." }, { status: 500 });
    }
    if (acceptanceError) console.error("[access-request/acceptance] tabela legal_acceptances ainda não criada");

    const updatedAt = new Date().toISOString();
    const [profileResult, requestResult] = await Promise.all([
      context.supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: updatedAt })
        .eq("id", context.claims.sub)
        .select("id")
        .abortSignal(AbortSignal.timeout(15_000))
        .maybeSingle(),
      context.supabase
        .from("access_requests")
        .update({
          full_name: fullName,
          requested_subdomain_slug: slug,
          requested_business_name: business,
          updated_at: updatedAt,
        })
        .eq("user_id", context.claims.sub)
        .select("id")
        .abortSignal(AbortSignal.timeout(15_000))
        .maybeSingle(),
    ]);

    const saveError = profileResult.error ?? requestResult.error;
    if (saveError || !profileResult.data || !requestResult.data) {
      console.error("[access-request/save] rejected", { code: saveError?.code ?? "missing_row" });
      return NextResponse.json({ error: "Não foi possível salvar a solicitação." }, { status: 400 });
    }

    return NextResponse.json({ success: true, slug }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "O envio demorou mais que o esperado. Tente novamente." }, { status: 500 });
  }
}
