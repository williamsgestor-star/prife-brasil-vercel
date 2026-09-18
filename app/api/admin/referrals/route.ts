import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

export const dynamic = "force-dynamic";

type ReferralRow = {
  tenant_id: string;
  slot_number: number;
  referred_name: string | null;
  referred_at: string | null;
};

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export async function GET(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context?.isAdmin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "Subdomínio inválido." }, { status: 400 });

  const { data, error } = await context.supabase
    .from("tenant_activation_referrals")
    .select("tenant_id,slot_number,referred_name,referred_at")
    .eq("tenant_id", tenantId)
    .order("slot_number");
  if (error) return NextResponse.json({ error: "Não foi possível consultar as indicações." }, { status: 500 });
  return NextResponse.json({ referrals: (data || []) as ReferralRow[] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    const context = await getAuthenticatedContext();
    if (!context?.isAdmin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
    const body = await request.json();
    if (!body || typeof body.tenantId !== "string" || !Array.isArray(body.referrals) || body.referrals.length !== 5) {
      return NextResponse.json({ error: "Confira as cinco indicações informadas." }, { status: 400 });
    }

    const seen = new Set<number>();
    const referrals = body.referrals.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("invalid_referral");
      const value = item as { slot?: unknown; name?: unknown; date?: unknown };
      if (!Number.isInteger(value.slot) || Number(value.slot) < 1 || Number(value.slot) > 5 || seen.has(Number(value.slot))) throw new Error("invalid_referral");
      seen.add(Number(value.slot));
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const date = typeof value.date === "string" ? value.date : "";
      if (name.length > 160 || (date && !validDate(date))) throw new Error("invalid_referral");
      return {
        tenant_id: body.tenantId,
        slot_number: Number(value.slot),
        referred_name: name || null,
        referred_at: date || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await context.supabase
      .from("tenant_activation_referrals")
      .upsert(referrals, { onConflict: "tenant_id,slot_number" })
      .select("tenant_id,slot_number,referred_name,referred_at");
    if (error) return NextResponse.json({ error: "Não foi possível salvar as indicações." }, { status: 400 });
    return NextResponse.json({ referrals: (data || []) as ReferralRow[] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Confira os nomes e as datas informados." }, { status: 400 });
  }
}

