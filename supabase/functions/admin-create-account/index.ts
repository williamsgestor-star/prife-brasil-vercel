import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { corsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const reservedSlugs = new Set(["www", "admin", "api", "mail", "app", "painel", "suporte"]);

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) return reply({ error: "configuration_error" }, 500);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: userData }, { data: isAdmin, error: adminError }] = await Promise.all([
    caller.auth.getUser(),
    caller.rpc("is_current_user_admin"),
  ]);
  if (!userData.user || adminError || isAdmin !== true) return reply({ error: "admin_access_required" }, 403);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const temporaryPassword = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !businessName || !slugPattern.test(slug) || reservedSlugs.has(slug)) {
    return reply({ error: "invalid_company_details" }, 400);
  }
  if (
    temporaryPassword.length < 12 || temporaryPassword.length > 64 ||
    !/[A-Z]/.test(temporaryPassword) || !/[a-z]/.test(temporaryPassword) ||
    !/[0-9]/.test(temporaryPassword) || !/[^A-Za-z0-9]/.test(temporaryPassword)
  ) {
    return reply({ error: "weak_temporary_password" }, 400);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: existingProfile, error: profileError }, { data: existingTenant, error: tenantError }] = await Promise.all([
    service.from("profiles").select("id,tenant_id").eq("email", email).maybeSingle(),
    service.from("tenants").select("id").eq("slug", slug).maybeSingle(),
  ]);
  if (profileError) return reply({ error: profileError.message }, 400);
  if (tenantError) return reply({ error: tenantError.message }, 400);
  if (existingTenant) return reply({ error: "subdomain_already_exists" }, 409);
  if (existingProfile?.tenant_id) return reply({ error: "owner_already_has_tenant" }, 409);
  if (existingProfile) return reply({ error: "owner_account_already_exists" }, 409);

  const { data: createdAccount, error: accountError } = await service.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (accountError || !createdAccount.user) {
    return reply({ error: `account_creation_failed: ${accountError?.message || "unknown_error"}` }, 400);
  }

  const { data: company, error: createError } = await caller.rpc("admin_create_tenant", {
    p_owner_email: email,
    p_owner_full_name: fullName,
    p_tenant_slug: slug,
    p_tenant_name: businessName,
  });
  if (createError) return reply({ error: createError.message }, 400);
  return reply({ company });
});
