import { NextResponse } from "next/server";

import { createDailyMeetingToken, getOrCreateDailyRoom, recordingPasswordIsValid, verifyMeetingInvite } from "../../../lib/meetings";

export async function POST(request: Request) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "A sala ainda não está configurada." }, { status: 503 });

  let body: { invite?: unknown; name?: unknown; recordingPassword?: unknown };
  try {
    body = await request.json() as { invite?: unknown; name?: unknown; recordingPassword?: unknown };
  } catch {
    return NextResponse.json({ error: "Dados de entrada inválidos." }, { status: 400 });
  }
  const invite = typeof body.invite === "string" ? body.invite.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const recordingPassword = typeof body.recordingPassword === "string" ? body.recordingPassword : "";
  const enableRecording = recordingPassword.length > 0;
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Informe seu nome (entre 2 e 80 caracteres)." }, { status: 400 });
  }
  if (enableRecording && !recordingPasswordIsValid(recordingPassword)) {
    return NextResponse.json({ error: "Senha de gravação incorreta." }, { status: 403 });
  }

  const payload = await verifyMeetingInvite(invite, apiKey);
  if (!payload) return NextResponse.json({ error: "Este convite é inválido ou já expirou." }, { status: 403 });

  try {
    const room = await getOrCreateDailyRoom(apiKey, payload.slug);
    if (room.roomName !== payload.roomName) throw new Error("room_mismatch");
    const authorization = await createDailyMeetingToken(apiKey, room.roomName, name, {
      expiresAt: payload.exp,
      isOwner: false,
      enableRecording,
    });
    return NextResponse.json({
      url: `${room.roomUrl}?t=${encodeURIComponent(authorization.token)}`,
      expiresAt: authorization.exp * 1000,
      recordingEnabled: enableRecording,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível autorizar sua entrada na sala." }, { status: 502 });
  }
}
