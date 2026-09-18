import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

export const dynamic = "force-dynamic";

async function resolveTenantId(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };

  const requestedTenant = request.headers.get("x-prife-tenant");
  let tenantId = context.profile?.tenant_id || "";
  if (context.isAdmin && requestedTenant) tenantId = requestedTenant;
  if (!tenantId) {
    const { data } = await context.supabase.rpc("get_prospector_daily_quota");
    const quota = Array.isArray(data) ? data[0] : data;
    tenantId = String(quota?.tenant_id || "");
  }
  if (!tenantId) return { error: NextResponse.json({ error: "Empresa não identificada." }, { status: 403 }) };
  return { context, tenantId };
}

export async function GET(request: Request) {
  const resolved = await resolveTenantId(request);
  if ("error" in resolved) return resolved.error;

  const [{ data: leads, error: leadsError }, { data: searches, error: searchesError }] = await Promise.all([
    resolved.context.supabase
      .from("prospector_leads")
      .select("id,provider_lead_id,company_name,category,address,phone,website,source_url,provider,country,latitude,longitude,source_payload,delivered_at")
      .eq("tenant_id", resolved.tenantId)
      .order("delivered_at", { ascending: false })
      .limit(500),
    resolved.context.supabase
      .from("prospector_searches")
      .select("id,query_text,provider,delivered_count,created_at")
      .eq("tenant_id", resolved.tenantId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (leadsError || searchesError) {
    console.error("Prospector history loading failed", {
      leadsCode: leadsError?.code,
      searchesCode: searchesError?.code,
      tenantId: resolved.tenantId,
    });
    return NextResponse.json({ error: "Não foi possível carregar o histórico de leads." }, { status: 500 });
  }

  return NextResponse.json({
    tenantId: resolved.tenantId,
    leads: (leads || []).map((lead) => {
      const payload = lead.source_payload && typeof lead.source_payload === "object"
        ? lead.source_payload as Record<string, unknown>
        : {};
      const distance = Number(payload.distanceKm);
      return {
        sourceId: lead.provider_lead_id || lead.id,
        name: lead.company_name,
        category: lead.category || "",
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        sourceUrl: lead.source_url || "#",
        provider: lead.provider,
        country: lead.country || "br",
        latitude: lead.latitude,
        longitude: lead.longitude,
        distanceKm: Number.isFinite(distance) ? distance : null,
        deliveredAt: lead.delivered_at,
      };
    }),
    searches: searches || [],
  }, { headers: { "Cache-Control": "no-store" } });
}
