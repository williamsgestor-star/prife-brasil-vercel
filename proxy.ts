import type { NextRequest } from "next/server";

import { updateSession } from "./app/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Arquivos estáticos (scripts, estilos, vídeos, áudio, fontes, imagens) não passam pela checagem
  // do banco: assim ficam guardados no navegador e na Vercel e não pesam em cada visita.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mov|mp3|m4a|ogg|wav|pdf|js|mjs|css|map|json|txt|xml|webmanifest)$).*)"],
};
