import { redirect } from "next/navigation";

import { createClient } from "./server";

export type ProtectedFeature = "prospector" | "ponto_vivo";

type ProfileRow = {
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  email: string;
  full_name: string | null;
  tenant_id: string | null;
};

export async function getAuthenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const [{ data: profile }, { data: adminFlag }] = await Promise.all([
    supabase
      .from("profiles")
      .select("approval_status,email,full_name,tenant_id")
      .eq("id", claims.sub)
      .maybeSingle<ProfileRow>(),
    supabase.rpc("is_current_user_admin"),
  ]);

  return {
    claims,
    email: String(claims.email ?? profile?.email ?? ""),
    displayName:
      profile?.full_name || String(claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? claims.email ?? "Usuário"),
    isAdmin: adminFlag === true,
    profile: profile ?? null,
    supabase,
  };
}

export async function requireAuthenticated(returnTo: string) {
  const context = await getAuthenticatedContext();
  if (!context) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return context;
}

export async function requireApprovedAccess(feature: ProtectedFeature, returnTo: string) {
  const context = await requireAuthenticated(returnTo);
  if (context.isAdmin) return context;

  if (context.profile?.approval_status !== "approved" || !context.profile.tenant_id) {
    redirect(`/aguardando-aprovacao?next=${encodeURIComponent(returnTo)}`);
  }

  const [{ data: tenant }, { data: features }] = await Promise.all([
    context.supabase
      .from("tenants")
      .select("status,site_enabled,billing_due_at,billing_exempt")
      .eq("id", context.profile.tenant_id)
      .maybeSingle<{ status: string; site_enabled: boolean; billing_due_at: string; billing_exempt: boolean }>(),
    context.supabase
      .from("tenant_features")
      .select("prospector_enabled,ponto_vivo_enabled")
      .eq("tenant_id", context.profile.tenant_id)
      .maybeSingle<{ prospector_enabled: boolean; ponto_vivo_enabled: boolean }>(),
  ]);

  const billingExpired = Boolean(
    tenant && !tenant.billing_exempt && new Date(tenant.billing_due_at).getTime() < Date.now(),
  );
  if (!tenant || tenant.status !== "active" || !tenant.site_enabled || billingExpired) {
    redirect("/acesso-indisponivel");
  }

  const enabled =
    feature === "prospector"
      ? features?.prospector_enabled
      : features?.ponto_vivo_enabled;
  if (!enabled) redirect("/acesso-indisponivel");

  return context;
}

export function safeNextPath(value: string | null | undefined, fallback = "/leads") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://prife-brasil.com");
    return url.origin === "https://prife-brasil.com"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
