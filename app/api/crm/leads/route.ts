import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

type ImportedLead = {
  sourceId?: string;
  name?: string;
  company_name?: string;
  category?: string;
  segment?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  website?: string;
  provider?: string;
  source?: string;
  sourceUrl?: string;
  source_url?: string;
  country?: string;
  lead_score?: number;
  social_profiles?: Record<string, string>;
};

const callingCodes: Record<string, string> = { br: "55", py: "595", ar: "54", uy: "598", bo: "591" };

function normalizeInternationalPhone(value: string, country = "br") {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return "";
  const recognizedCode = Object.values(callingCodes).sort((a, b) => b.length - a.length).find((candidate) => digits.startsWith(candidate));
  if (recognizedCode) return digits.slice(0, 18);
  const code = callingCodes[country.toLowerCase()] || callingCodes.br;
  return digits.startsWith(code) ? digits.slice(0, 18) : `${code}${digits.replace(/^0+/, "")}`.slice(0, 18);
}

async function tenantContext(request: Request) {
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
  const resolved = await tenantContext(request);
  if ("error" in resolved) return resolved.error;
  const [leadsResult, featuresResult] = await Promise.all([
    resolved.context.supabase
      .from("crm_leads")
      .select("id,company_name,segment,phone,whatsapp,email,address,website,source,source_url,status,notes,lead_score,next_follow_up_at,social_profiles,metadata,last_contact_at,created_at,updated_at")
      .eq("tenant_id", resolved.tenantId)
      .order("created_at", { ascending: false })
      .limit(1000),
    resolved.context.supabase
      .from("tenant_features")
      .select("crm_stage_labels")
      .eq("tenant_id", resolved.tenantId)
      .maybeSingle<{ crm_stage_labels: Record<string, string> | null }>(),
  ]);
  if (leadsResult.error) return NextResponse.json({ error: "Não foi possível carregar o CRM." }, { status: 500 });
  return NextResponse.json({ leads: leadsResult.data || [], tenantId: resolved.tenantId, stageLabels: featuresResult.data?.crm_stage_labels || {} });
}

export async function PUT(request: Request) {
  const resolved = await tenantContext(request);
  if ("error" in resolved) return resolved.error;
  const body = await request.json().catch(() => null) as { stage_labels?: Record<string, unknown> } | null;
  const validStatuses = ["novo", "whatsapp", "contatado", "interessado", "reuniao", "proposta", "cliente", "perdido"];
  if (!body?.stage_labels || typeof body.stage_labels !== "object" || Array.isArray(body.stage_labels)) {
    return NextResponse.json({ error: "Nomes das etapas inválidos." }, { status: 400 });
  }
  const stageLabels = Object.fromEntries(validStatuses.flatMap((status) => {
    const label = typeof body.stage_labels?.[status] === "string" ? body.stage_labels[status].trim().slice(0, 40) : "";
    return label ? [[status, label]] : [];
  }));
  const { data, error } = await resolved.context.supabase
    .from("tenant_features")
    .update({ crm_stage_labels: stageLabels, updated_at: new Date().toISOString() })
    .eq("tenant_id", resolved.tenantId)
    .select("crm_stage_labels")
    .single<{ crm_stage_labels: Record<string, string> }>();
  if (error) return NextResponse.json({ error: "Não foi possível salvar os nomes das etapas." }, { status: 500 });
  return NextResponse.json({ stageLabels: data.crm_stage_labels });
}

export async function POST(request: Request) {
  const resolved = await tenantContext(request);
  if ("error" in resolved) return resolved.error;
  const body = await request.json().catch(() => null) as { leads?: ImportedLead[] } | null;
  const leads = Array.isArray(body?.leads) ? body.leads.slice(0, 500) : [];
  const normalizedByPhone = new Map<string, Record<string, unknown>>();
  leads.forEach((lead) => {
    const phone = normalizeInternationalPhone(String(lead.phone || lead.whatsapp || ""), String(lead.country || "br"));
    const companyName = String(lead.name || lead.company_name || "").trim().slice(0, 180);
    if (!phone || !companyName) return;
    normalizedByPhone.set(phone, {
      tenant_id: resolved.tenantId,
      created_by: String(resolved.context.claims.sub),
      source_id: String(lead.sourceId || "").slice(0, 240) || null,
      company_name: companyName,
      segment: String(lead.category || lead.segment || "").slice(0, 160) || null,
      phone,
      whatsapp: phone,
      email: String(lead.email || "").trim().slice(0, 180) || null,
      address: String(lead.address || "").trim().slice(0, 500) || null,
      website: String(lead.website || "").trim().slice(0, 500) || null,
      source: String(lead.provider || lead.source || "Importação").slice(0, 120),
      source_url: String(lead.sourceUrl || lead.source_url || "").trim().slice(0, 500) || null,
      lead_score: Math.max(0, Math.min(100, Number(lead.lead_score || 0))),
      social_profiles: lead.social_profiles && typeof lead.social_profiles === "object" ? lead.social_profiles : {},
      updated_at: new Date().toISOString(),
    });
  });
  const normalized = [...normalizedByPhone.values()];
  if (!normalized.length) return NextResponse.json({ error: "Nenhum lead válido com nome e telefone." }, { status: 400 });
  const { data, error } = await resolved.context.supabase
    .from("crm_leads")
    .upsert(normalized, { onConflict: "tenant_id,phone", ignoreDuplicates: false })
    .select("id");
  if (error) {
    console.error("CRM lead import failed", {
      code: error.code,
      message: error.message,
      hint: error.hint,
      tenantId: resolved.tenantId,
      count: normalized.length,
    });
    return NextResponse.json({ error: "Não foi possível importar os leads." }, { status: 500 });
  }
  return NextResponse.json({ imported: data?.length || normalized.length });
}

export async function DELETE(request: Request) {
  const resolved = await tenantContext(request);
  if ("error" in resolved) return resolved.error;
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Lead inválido." }, { status: 400 });
  const { data, error } = await resolved.context.supabase
    .from("crm_leads")
    .delete()
    .eq("id", body.id)
    .eq("tenant_id", resolved.tenantId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return NextResponse.json({ error: "Não foi possível excluir o lead." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ deleted: true, id: data.id });
}

export async function PATCH(request: Request) {
  const resolved = await tenantContext(request);
  if ("error" in resolved) return resolved.error;
  const body = await request.json().catch(() => null) as { id?: string; status?: string; notes?: string; lead_score?: number; next_follow_up_at?: string | null } | null;
  const validStatuses = new Set(["novo", "whatsapp", "contatado", "interessado", "reuniao", "proposta", "cliente", "perdido"]);
  if (!body?.id || (body.status !== undefined && !validStatuses.has(body.status))) {
    return NextResponse.json({ error: "Atualização inválida." }, { status: 400 });
  }
  const score = body.lead_score === undefined ? undefined : Math.max(0, Math.min(100, Math.round(Number(body.lead_score))));
  if (score !== undefined && !Number.isFinite(score)) {
    return NextResponse.json({ error: "Pontuação inválida." }, { status: 400 });
  }
  const { data: previous } = await resolved.context.supabase
    .from("crm_leads")
    .select("status")
    .eq("id", body.id)
    .eq("tenant_id", resolved.tenantId)
    .maybeSingle<{ status: string }>();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    updates.status = body.status;
    updates.last_contact_at = body.status === "novo" ? null : new Date().toISOString();
  }
  if (body.notes !== undefined) updates.notes = String(body.notes || "").slice(0, 2000) || null;
  if (score !== undefined) updates.lead_score = score;
  if (body.next_follow_up_at !== undefined) {
    const parsedDate = body.next_follow_up_at ? new Date(body.next_follow_up_at) : null;
    if (parsedDate && Number.isNaN(parsedDate.getTime())) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    updates.next_follow_up_at = parsedDate?.toISOString() || null;
  }
  const { error } = await resolved.context.supabase
    .from("crm_leads")
    .update(updates)
    .eq("id", body.id)
    .eq("tenant_id", resolved.tenantId);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o lead." }, { status: 500 });
  if (body.status && previous?.status !== body.status) {
    await resolved.context.supabase.from("crm_lead_events").insert({
      tenant_id: resolved.tenantId,
      lead_id: body.id,
      actor_user_id: String(resolved.context.claims.sub),
      event_type: "status_changed",
      from_status: previous?.status || null,
      to_status: body.status,
    });
  }
  return NextResponse.json({ ok: true });
}
