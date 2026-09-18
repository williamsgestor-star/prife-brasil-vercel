import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!context.isAdmin) return NextResponse.json({ error: "Acesso restrito ao administrador principal." }, { status: 403 });

  const password = String(process.env.DAILY_RECORDING_PASSWORD || "").trim();
  if (password.length < 8) return NextResponse.json({ error: "A senha de gravação ainda não foi configurada." }, { status: 503 });

  return NextResponse.json(
    { password },
    { headers: { "Cache-Control": "no-store, private", Pragma: "no-cache" } },
  );
}
