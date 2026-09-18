import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

const BUCKET = "tenant-media";
const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIA_TYPES: Record<string, { extension: string; video: boolean }> = {
  "image/jpeg": { extension: "jpg", video: false },
  "image/png": { extension: "png", video: false },
  "image/webp": { extension: "webp", video: false },
  "video/mp4": { extension: "mp4", video: true },
  "video/webm": { extension: "webm", video: true },
  "video/quicktime": { extension: "mov", video: true },
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const context = await getAuthenticatedContext();
    if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente no painel." }, { status: 401 });
    if (!context.isAdmin) return NextResponse.json({ error: "Apenas a conta administradora pode enviar este arquivo." }, { status: 403 });

    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId") ?? "";
    const kind = url.searchParams.get("kind") ?? "";
    if (!TENANT_ID.test(tenantId) || !["leader", "gallery", "videos"].includes(kind)) {
      return NextResponse.json({ error: "Destino do arquivo inválido." }, { status: 400 });
    }

    const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
    const mediaType = MEDIA_TYPES[contentType];
    if (!mediaType || (kind === "videos") !== mediaType.video) {
      return NextResponse.json({ error: "Formato de arquivo não permitido." }, { status: 415 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const maxBytes = (mediaType.video ? 50 : 15) * 1024 * 1024;
    if (contentLength > maxBytes) {
      return NextResponse.json({ error: `O arquivo excede o limite de ${mediaType.video ? 50 : 15} MB.` }, { status: 413 });
    }
    if (!request.body) return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });

    const { data: tenant } = await context.supabase.from("tenants").select("id").eq("id", tenantId).maybeSingle();
    if (!tenant) return NextResponse.json({ error: "Subdomínio não encontrado." }, { status: 404 });

    const { data: sessionData, error: sessionError } = await context.supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      return NextResponse.json({ error: "Sua sessão expirou. Entre novamente no painel." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) throw new Error("storage_not_configured");

    const path = `${tenantId}/${kind}/${crypto.randomUUID()}.${mediaType.extension}`;
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    console.log("[media/upload] forwarding", { requestId, tenantId, kind, contentType, contentLength });

    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${accessToken}`,
        "cache-control": "3600",
        "content-type": contentType,
        "x-upsert": "false",
      },
      body: request.body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    if (!uploadResponse.ok) {
      const storageError = (await uploadResponse.text()).slice(0, 500);
      console.error("[media/upload] storage rejected", { requestId, status: uploadResponse.status, storageError });
      return NextResponse.json({ error: "O armazenamento recusou o arquivo. Tente novamente." }, { status: uploadResponse.status });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
    console.log("[media/upload] completed", { requestId, path, elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ path, publicUrl });
  } catch (error) {
    console.error("[media/upload] failed", { requestId, error: String(error), elapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Não foi possível concluir o envio. Tente novamente." }, { status: 500 });
  }
}
