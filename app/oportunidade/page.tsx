import type { Metadata } from "next";

import CapturePage from "../components/CapturePage";
import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Oportunidade Prife | Prife Brasil" },
  description: "Entenda a oportunidade independente Prife, suas atividades, requisitos, custos, regras atuais e suporte, sem promessa de renda.",
  alternates: { canonical: "/oportunidade" },
};

export default async function OpportunityCapturePage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const leaderImage = tenant?.leader_image_url || "/brand/williams-costa-leite.webp";

  return <CapturePage variant="opportunity" ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} leaderImage={leaderImage} />;
}
