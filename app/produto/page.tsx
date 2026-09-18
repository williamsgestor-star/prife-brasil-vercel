import type { Metadata } from "next";

import CapturePage from "../components/CapturePage";
import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "iTeraCare Classic Plus | Prife Brasil" },
  description: "Conheça o iTeraCare Classic Plus com informações responsáveis sobre modelos, características, cuidados e condições atuais.",
  alternates: { canonical: "/produto" },
};

export default async function ProductCapturePage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const leaderImage = tenant?.leader_image_url || "/brand/williams-costa-leite.webp";

  return <CapturePage variant="product" ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} leaderImage={leaderImage} />;
}
