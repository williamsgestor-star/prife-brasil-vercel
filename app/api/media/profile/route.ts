import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "../../../lib/supabase/access";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedContext();
    if (!context || !context.isAdmin) {
      return NextResponse.json({ error: "admin_access_required" }, { status: 403 });
    }
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        typeof payload.p_tenant_id !== "string") {
      return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
    }
    // Fixed RPC and authenticated client preserve the existing database checks.
    const { error } = await context.supabase.rpc("save_tenant_site_profile", payload)
      .abortSignal(AbortSignal.timeout(15000));
    if (error) {
      console.error("[profile/save] rejected", { code: error.code });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "save_timeout_or_failed" }, { status: 500 });
  }
}
