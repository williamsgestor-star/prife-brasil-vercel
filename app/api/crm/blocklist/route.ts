import { NextResponse } from "next/server";

import { isMissingTableError, phoneHash } from "../../../lib/contact-blocklist";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

// "Não contatar": coloca o telefone do lead na lista de bloqueio da empresa e apaga o lead do CRM.
// Fica guardado só o telefone codificado, para o Prospector e a importação não o trazerem de volta.
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const requestedTenant = request.headers.get("x-prife-tenant");
  let tenantId = context.profile?.tenant_id || "";
  if (context.isAdmin && requestedTenant) tenantId = requestedTenant;
  if (!tenantId) {
    const { data } = await context.supabase.rpc("get_prospector_daily_quota");
    tenantId = String((Array.isArray(data) ? data[0] : data)?.tenant_id || "");
  }
  if (!tenantId) return NextResponse.json({ error: "Empresa não identificada." }, { status: 403 });

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Lead inválido." }, { status: 400 });

  const { data: lead, error: leadError } = await context.supabase
    .from("crm_leads")
    .select("id,phone")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ id: string; phone: string }>();
  if (leadError) return NextResponse.json({ error: "Não foi possível carregar o lead." }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const { error: blockError } = await context.supabase
    .from("crm_contact_blocklist")
    .upsert(
      { tenant_id: tenantId, phone_hash: await phoneHash(lead.phone), reason: "pedido_do_contato", created_by: String(context.claims.sub) },
      { onConflict: "tenant_id,phone_hash", ignoreDuplicates: true },
    );
  if (blockError) {
    if (isMissingTableError(blockError)) {
      return NextResponse.json({ error: "A lista de bloqueio ainda não foi ativada no banco. Peça à administração." }, { status: 503 });
    }
    console.error("CRM blocklist insert failed", { code: blockError.code });
    return NextResponse.json({ error: "Não foi possível bloquear o contato." }, { status: 500 });
  }

  const { error: deleteError } = await context.supabase
    .from("crm_leads")
    .delete()
    .eq("id", lead.id)
    .eq("tenant_id", tenantId);
  if (deleteError) return NextResponse.json({ error: "O número foi bloqueado, mas o lead não pôde ser apagado. Apague-o manualmente." }, { status: 500 });

  return NextResponse.json({ blocked: true, id: lead.id });
}
