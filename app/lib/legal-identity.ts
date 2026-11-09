import { internationalWhatsAppNumber, resolveCurrentTenantSite } from "./tenant-site";

// Quem responde pelo site aberto (site principal ou subdomínio de um distribuidor).
// Usa só dados já cadastrados no perfil público do subdomínio; nada é inventado.
export type LegalIdentity = {
  isPrimary: boolean;
  ownerName: string;
  businessName: string;
  email: string | null;
  whatsapp: string;
  host: string;
};

export async function currentLegalIdentity(): Promise<LegalIdentity> {
  const resolution = await resolveCurrentTenantSite();
  const profile = resolution.profile;
  const slug = profile?.slug || resolution.slug || "williams";
  const isPrimary = slug === "williams";
  return {
    isPrimary,
    ownerName: profile?.owner_name?.trim() || "Williams Costa Leite",
    businessName: profile?.business_name?.trim() || "Prife Brasil",
    email: profile?.public_email?.trim() || null,
    whatsapp: internationalWhatsAppNumber(profile),
    host: isPrimary ? "www.prife-brasil.com" : `${slug}.prife-brasil.com`,
  };
}
