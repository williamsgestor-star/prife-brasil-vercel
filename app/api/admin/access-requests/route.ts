import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

export const dynamic = "force-dynamic";

type AdminAction = "save" | "approve" | "reject";

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }

    const context = await getAuthenticatedContext();
    if (!context?.isAdmin) {
      return NextResponse.json({ error: "Sua sessão expirou ou não possui acesso administrativo." }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as {
      action?: unknown;
      requestId?: unknown;
      fullName?: unknown;
      business?: unknown;
      slug?: unknown;
    } | null;
    const action = body?.action as AdminAction;
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    if (!requestId || !["save", "approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
    }

    if (action === "reject") {
      const { error } = await context.supabase
        .rpc("reject_access_request", { p_request_id: requestId })
        .abortSignal(AbortSignal.timeout(15_000));
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const business = typeof body?.business === "string" ? body.business.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!fullName || !business || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      return NextResponse.json({ error: "Confira o nome, a empresa e o subdomínio." }, { status: 400 });
    }

    const { error: saveError } = await context.supabase
      .rpc("admin_update_access_request", {
        p_request_id: requestId,
        p_full_name: fullName,
        p_requested_subdomain_slug: slug,
        p_requested_business_name: business,
      })
      .abortSignal(AbortSignal.timeout(15_000));
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });

    if (action === "approve") {
      const { error: approveError } = await context.supabase
        .rpc("approve_access_request", {
          p_request_id: requestId,
          p_tenant_slug: slug,
          p_tenant_name: business,
        })
        .abortSignal(AbortSignal.timeout(15_000));
      if (approveError) return NextResponse.json({ error: approveError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A operação demorou mais que o esperado. Atualize a página e confira antes de tentar novamente." }, { status: 500 });
  }
}
