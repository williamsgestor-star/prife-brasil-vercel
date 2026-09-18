import { NextResponse } from "next/server";

import { safeNextPath } from "../../../lib/supabase/access";
import { createClient } from "../../../lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; next?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nextPath = safeNextPath(typeof body.next === "string" ? body.next : null);

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const supabase = await createClient();
    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      console.error("Falha ao enviar código de acesso:", error.message);
      return NextResponse.json(
        { error: "Não foi possível enviar o código agora. Aguarde um instante e tente novamente." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro inesperado no envio do código:", error);
    return NextResponse.json(
      { error: "A solicitação demorou mais que o esperado. Tente novamente." },
      { status: 500 },
    );
  }
}
