import { NextResponse } from "next/server";

import { createClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const [{ data: userData, error: userError }, { data: isAdmin, error: adminError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("is_current_user_admin"),
    ]);
    if (userError || !userData.user || adminError || isAdmin !== true) {
      return NextResponse.json({ error: "admin_access_required" }, { status: 403 });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      return NextResponse.json({ error: "admin_session_missing" }, { status: 401 });
    }

    const body = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      return NextResponse.json({ error: "configuration_error" }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-account`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({ error: "invalid_function_response" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Falha na criação administrativa da empresa:", error);
    return NextResponse.json({ error: "create_company_request_failed" }, { status: 500 });
  }
}
