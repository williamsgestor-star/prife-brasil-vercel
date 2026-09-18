import { NextResponse } from "next/server";

import { createMeetingInvite, getOrCreateDailyRoom, meetingOriginForSlug, normalizeMeetingSlug } from "../../../lib/meetings";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

export async function POST() {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!context.isAdmin && (context.profile?.approval_status !== "approved" || !context.profile.tenant_id)) {
    return NextResponse.json({ error: "Acesso ainda não aprovado." }, { status: 403 });
  }
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "A sala ainda não está configurada." }, { status: 503 });

  let tenantId = context.profile?.tenant_id || "";
  if (!tenantId) {
    const { data } = await context.supabase.rpc("get_prospector_daily_quota");
    tenantId = String((Array.isArray(data) ? data[0] : data)?.tenant_id || "");
  }
  if (!tenantId) return NextResponse.json({ error: "Empresa não identificada." }, { status: 403 });

  const { data: tenant } = await context.supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle<{ slug: string }>();
  const slug = normalizeMeetingSlug(String(tenant?.slug || tenantId));

  try {
    const room = await getOrCreateDailyRoom(apiKey, slug);
    const signed = await createMeetingInvite(apiKey, slug, room.roomName);
    return NextResponse.json({
      inviteUrl: `${meetingOriginForSlug(slug)}/reuniao/convidado?convite=${encodeURIComponent(signed.invite)}`,
      expiresAt: signed.expiresAt * 1000,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o convite agora." }, { status: 502 });
  }
}
