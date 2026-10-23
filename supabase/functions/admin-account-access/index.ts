import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { corsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";

// Só o administrador: mostra o e-mail de login do dono de um subdomínio e gera uma nova senha provisória.
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const authorization = request.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) return reply({ error: "configuration_error" }, 500);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: userData }, { data: isAdmin, error: adminError }] = await Promise.all([caller.auth.getUser(), caller.rpc("is_current_user_admin")]);
  if (!userData.user || adminError || isAdmin !== true) return reply({ error: "admin_access_required" }, 403);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
  const action = body?.action === "reset" ? "reset" : "info";
  if (!uuid.test(tenantId)) return reply({ error: "invalid_tenant" }, 400);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: tenant, error: tenantError } = await service.from("tenants").select("id,slug,owner_user_id").eq("id", tenantId).maybeSingle();
  if (tenantError) return reply({ error: tenantError.message }, 400);
  if (!tenant?.owner_user_id) return reply({ error: "tenant_not_found" }, 404);
  const { data: owner, error: ownerError } = await service.auth.admin.getUserById(tenant.owner_user_id);
  if (ownerError || !owner.user) return reply({ error: "owner_not_found" }, 404);
  const email = owner.user.email || "";
  const lastSignIn = owner.user.last_sign_in_at || null;

  if (action === "info") return reply({ email, lastSignIn });

  const password = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";
  if (password.length < 12 || password.length > 64 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return reply({ error: "weak_temporary_password" }, 400);
  }
  const { error: updateError } = await service.auth.admin.updateUserById(tenant.owner_user_id, { password });
  if (updateError) return reply({ error: `password_update_failed: ${updateError.message}` }, 400);
  return reply({ email, reset: true });
});
