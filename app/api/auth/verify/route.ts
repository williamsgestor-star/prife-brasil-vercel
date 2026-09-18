import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,8}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; token?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const token = typeof body.token === "string" ? body.token.replace(/\s/g, "") : "";

    if (!EMAIL_PATTERN.test(email) || !OTP_PATTERN.test(token)) {
      return NextResponse.json({ error: "Código inválido ou expirado. Solicite um novo código." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      return NextResponse.json({ error: "O acesso está temporariamente indisponível." }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      return NextResponse.json({ error: "Código inválido ou expirado. Solicite um novo código." }, { status: 400 });
    }

    return response;
  } catch (error) {
    console.error("Erro inesperado na validação do código:", error);
    return NextResponse.json(
      { error: "Não foi possível validar o código agora. Tente novamente." },
      { status: 500 },
    );
  }
}
