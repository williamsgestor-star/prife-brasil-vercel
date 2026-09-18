import type { Metadata } from "next";

import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";
import OpportunityPresentation from "./OpportunityPresentation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Apresentação da Oportunidade | Prife Brasil" },
  description: "Apresentação interativa do ecossistema, das ferramentas e da oportunidade independente Prife.",
  alternates: { canonical: "/apresentacao" },
};

export default async function PresentationPage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  return <OpportunityPresentation ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} />;
}
