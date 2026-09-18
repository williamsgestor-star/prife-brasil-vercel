import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "../../lib/supabase/access";
import CompanyEditor from "../../painel/CompanyEditor";
import styles from "../../painel/Panel.module.css";
import type { SiteSubscription } from "../../lib/site-subscription";
import { emptyTenantSiteProfile, type ManagedCompany, type TenantSiteProfile } from "../../painel/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel geral de empresas", description: "Área privada para administração dos subdomínios Prife Brasil.", robots: { index: false, follow: false } };

type TenantRow = { id: string; slug: string; display_name: string; owner_user_id: string; status: string; site_enabled: boolean; billing_started_at: string; billing_due_at: string; last_payment_at: string | null };
type ProfileRow = { id: string; email: string; full_name: string | null };
type SiteProfileRow = TenantSiteProfile & { tenant_id: string };

export default async function AdminCompaniesPage() {
  const context = await requireAuthenticated("/admin/empresas");
  if (!context.isAdmin) redirect("/leads");

  const { data: tenantsData } = await context.supabase.from("tenants").select("id,slug,display_name,owner_user_id,status,site_enabled,billing_started_at,billing_due_at,last_payment_at").order("created_at", { ascending: true });
  const tenants = (tenantsData ?? []) as TenantRow[];
  const ownerIds = tenants.map((item) => item.owner_user_id);
  const tenantIds = tenants.map((item) => item.id);
  const [{ data: profilesData }, { data: siteProfilesData }] = await Promise.all([
    ownerIds.length ? context.supabase.from("profiles").select("id,email,full_name").in("id", ownerIds) : Promise.resolve({ data: [] }),
    tenantIds.length ? context.supabase.from("tenant_site_profiles").select("tenant_id,public_email,phone,whatsapp,whatsapp_country_code,whatsapp_area_code,whatsapp_local_number,address,description,instagram_url,facebook_url,youtube_url,logo_url,cover_url,leader_role,leader_heading,leader_quote,leader_image_url,gallery_urls,gallery_titles,gallery_descriptions,video_urls,video_titles,video_descriptions,visual_settings").in("tenant_id", tenantIds) : Promise.resolve({ data: [] }),
  ]);
  const profiles = new Map(((profilesData ?? []) as ProfileRow[]).map((item) => [item.id, item]));
  const siteProfiles = new Map(((siteProfilesData ?? []) as SiteProfileRow[]).map((item) => [item.tenant_id, item]));
  const companies: ManagedCompany[] = tenants.map((tenant) => {
    const owner = profiles.get(tenant.owner_user_id);
    const saved = siteProfiles.get(tenant.id);
    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      businessName: tenant.display_name,
      ownerUserId: tenant.owner_user_id,
      ownerName: owner?.full_name ?? "Proprietário",
      loginEmail: owner?.email ?? "",
      status: tenant.status,
      subscription: {
        tenant_id: tenant.id,
        enabled: tenant.site_enabled,
        started_at: tenant.billing_started_at,
        expires_at: tenant.billing_due_at,
        last_paid_at: tenant.last_payment_at,
        version: 0,
      } satisfies SiteSubscription,
      profile: { ...emptyTenantSiteProfile, ...(saved ?? {}) },
    };
  });

  return <main className={styles.page}><header className={styles.header}><a href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a><nav><Link href="/admin/acessos">Solicitações</Link><Link href="/leads">Prospector</Link><Link href="/ponto-vivo">PontoVivo</Link><a href="/auth/signout">Sair</a></nav></header><CompanyEditor initialCompanies={companies} adminMode /></main>;
}
