import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

export const dynamic = "force-dynamic";

type TenantBillingRow = {
  id: string;
  site_enabled: boolean;
  billing_started_at: string;
  billing_due_at: string;
  last_payment_at: string | null;
};

function asSubscription(row: TenantBillingRow) {
  return {
    tenant_id: row.id,
    enabled: row.site_enabled,
    started_at: row.billing_started_at,
    expires_at: row.billing_due_at,
    last_paid_at: row.last_payment_at,
    version: 0,
  };
}

export async function GET(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context?.isAdmin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "Subdomínio inválido." }, { status: 400 });
  const { data, error } = await context.supabase.from("tenants").select("id,site_enabled,billing_started_at,billing_due_at,last_payment_at").eq("id", tenantId).maybeSingle<TenantBillingRow>();
  if (error) return NextResponse.json({ error: "Não foi possível consultar a mensalidade." }, { status: 500 });
  return NextResponse.json({ subscription: data ? asSubscription(data) : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    const context = await getAuthenticatedContext();
    if (!context?.isAdmin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
    const body = await request.json();
    const validPlans = ["monthly", "semiannual", "annual"];
    const validCourtesyDays = [7, 15, 30];
    if (!body || typeof body.tenantId !== "string" || !["toggle", "payment", "courtesy"].includes(body.action) ||
      (body.action === "toggle" && typeof body.enabled !== "boolean") ||
      (body.action === "payment" && (!validPlans.includes(body.plan) || typeof body.requestId !== "string")) ||
      (body.action === "courtesy" && !validCourtesyDays.includes(body.days))) {
      return NextResponse.json({ error: "Confira os dados informados." }, { status: 400 });
    }
    const rpcName = body.action === "toggle" ? "admin_set_tenant_site_enabled"
      : body.action === "courtesy" ? "admin_extend_tenant_courtesy" : "admin_register_tenant_payment";
    const rpcArgs = body.action === "toggle"
      ? { p_tenant_id: body.tenantId, p_enabled: body.enabled }
      : body.action === "courtesy"
        ? { p_tenant_id: body.tenantId, p_days: body.days }
        : { p_tenant_id: body.tenantId, p_plan: body.plan, p_request_id: body.requestId };
    const { data, error } = await context.supabase.rpc(rpcName, rpcArgs).abortSignal(AbortSignal.timeout(15000));
    if (body.action === "courtesy" && error && (error.code === "PGRST202" || error.message?.includes("admin_extend_tenant_courtesy"))) {
      return NextResponse.json({ error: "A cortesia ainda não foi instalada no banco. Rode o arquivo de cortesia no Supabase (SQL Editor) e tente de novo." }, { status: 501 });
    }
    if (error?.message?.includes("payment_already_registered_today")) {
      return NextResponse.json({ error: "Já existe um pagamento registrado hoje para este subdomínio." }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: "Não foi possível salvar. Confira os dados e tente novamente." }, { status: 400 });
    const row = (Array.isArray(data) ? data[0] : data) as TenantBillingRow;
    return NextResponse.json({ subscription: asSubscription(row) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar a operação. Confira o prazo atualizado antes de tentar novamente." }, { status: 500 });
  }
}
