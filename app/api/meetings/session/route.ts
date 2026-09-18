import { NextResponse } from "next/server";

import { createDailyMeetingToken, getOrCreateDailyRoom, MEETING_SESSION_SECONDS, normalizeMeetingSlug, recordingPasswordIsValid } from "../../../lib/meetings";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

export async function POST(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!context.isAdmin && (context.profile?.approval_status !== "approved" || !context.profile.tenant_id)) {
    return NextResponse.json({ error: "Acesso ainda não aprovado." }, { status: 403 });
  }
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "A sala está preparada. Falta configurar a chave privada Daily para ativar as chamadas." }, { status: 503 });
  }
  let recordingPassword = "";
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await request.json() as { recordingPassword?: unknown };
      recordingPassword = typeof body.recordingPassword === "string" ? body.recordingPassword : "";
    } catch {
      return NextResponse.json({ error: "Dados de entrada inválidos." }, { status: 400 });
    }
  }
  const enableRecording = recordingPassword.length > 0;
  if (enableRecording && !recordingPasswordIsValid(recordingPassword)) {
    return NextResponse.json({ error: "Senha de gravação incorreta." }, { status: 403 });
  }
  let tenantId = context.profile?.tenant_id || "";
  if (!tenantId) {
    const { data } = await context.supabase.rpc("get_prospector_daily_quota");
    tenantId = String((Array.isArray(data) ? data[0] : data)?.tenant_id || "");
  }
  if (!tenantId) return NextResponse.json({ error: "Empresa não identificada." }, { status: 403 });

  const [{ data: tenant }, { data: membership }] = await Promise.all([
    context.supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle<{slug:string}>(),
    context.supabase.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", context.claims.sub).maybeSingle<{role:string}>(),
  ]);
  const slug = normalizeMeetingSlug(String(tenant?.slug || tenantId));
  try {
    const room = await getOrCreateDailyRoom(apiKey, slug);
    const authorization = await createDailyMeetingToken(apiKey, room.roomName, context.displayName, {
      userId: String(context.claims.sub),
      isOwner: context.isAdmin || membership?.role === "owner",
      enableRecording,
    });
    return NextResponse.json({
      url: `${room.roomUrl}?t=${encodeURIComponent(authorization.token)}`,
      expiresAt: authorization.exp * 1000,
      durationSeconds: MEETING_SESSION_SECONDS,
      room: room.roomName,
      recordingEnabled: enableRecording,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar ou autorizar a sala Daily." }, { status: 502 });
  }
}
