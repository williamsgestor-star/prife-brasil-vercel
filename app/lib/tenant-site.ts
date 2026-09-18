import { headers } from "next/headers";

import { createClient } from "./supabase/server";

export type PublicTenantSiteProfile = {
  slug: string;
  business_name: string;
  owner_name: string;
  public_email: string | null;
  whatsapp_country_code: string | null;
  whatsapp_area_code: string | null;
  whatsapp_local_number: string | null;
  whatsapp: string | null;
  description: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  leader_role: string | null;
  leader_heading: string | null;
  leader_quote: string | null;
  leader_image_url: string | null;
  gallery_urls: string[];
  gallery_titles: string[];
  gallery_descriptions: string[];
  video_urls: string[];
  video_titles: string[];
  video_descriptions: string[];
  visual_settings: Record<string, unknown>;
  updated_at: string;
};

function slugFromHostname(hostname: string) {
  const host = hostname.toLowerCase().split(":")[0].replace(/^www\./, "");
  if (host === "prife-brasil.com" || host.endsWith(".chatgpt.site")) return "williams";
  const suffix = ".prife-brasil.com";
  if (!host.endsWith(suffix)) return "williams";
  const slug = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : "williams";
}

export type CurrentTenantSiteResolution = {
  profile: PublicTenantSiteProfile | null;
  slug: string;
  unavailable: boolean;
  lookupFailed: boolean;
};

export async function resolveCurrentTenantSite(): Promise<CurrentTenantSiteResolution> {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "prife-brasil.com";
  const slug = slugFromHostname(hostname);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_tenant_site_profile", { p_slug: slug });
    if (error) return { profile: null, slug, unavailable: false, lookupFailed: true };
    const row = Array.isArray(data) ? data[0] : data;
    const profile = (row ?? null) as PublicTenantSiteProfile | null;
    return { profile, slug, unavailable: !profile, lookupFailed: false };
  } catch {
    return { profile: null, slug, unavailable: false, lookupFailed: true };
  }
}

export async function getCurrentTenantSiteProfile() {
  return (await resolveCurrentTenantSite()).profile;
}

export function internationalWhatsAppNumber(profile: PublicTenantSiteProfile | null) {
  if (!profile) return "5544998847361";
  const parts = [profile.whatsapp_country_code, profile.whatsapp_area_code, profile.whatsapp_local_number]
    .map((value) => String(value ?? "").replace(/\D/g, ""))
    .filter(Boolean);
  return parts.join("") || String(profile.whatsapp ?? "").replace(/\D/g, "") || "5544998847361";
}

export function publicProfileScript(profile: PublicTenantSiteProfile | null) {
  return JSON.stringify(profile ?? {}).replace(/</g, "\\u003c");
}
