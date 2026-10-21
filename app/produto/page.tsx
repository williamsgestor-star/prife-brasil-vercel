import type { Metadata } from "next";

import CapturePage from "../components/CapturePage";
import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "iTeraCare Classic Plus: modelos e cuidados | Prife Brasil" },
  description: "Conheça o iTeraCare Classic Plus: modelos, características, cuidados de uso e condições atuais. Tire dúvidas com um distribuidor independente PRIFE pelo WhatsApp.",
  alternates: { canonical: "/produto" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Prife Brasil",
    url: "/produto",
    title: "iTeraCare Classic Plus: modelos e cuidados | Prife Brasil",
    description: "Conheça o iTeraCare Classic Plus: modelos, características, cuidados de uso e condições atuais. Tire dúvidas com um distribuidor independente PRIFE pelo WhatsApp.",
    images: [{ url: "/og-prife-brasil.webp", alt: "iTeraCare Classic Plus: modelos e cuidados | Prife Brasil" }],
  },
  twitter: { card: "summary_large_image", title: "iTeraCare Classic Plus: modelos e cuidados | Prife Brasil", description: "Conheça o iTeraCare Classic Plus: modelos, características, cuidados de uso e condições atuais. Tire dúvidas com um distribuidor independente PRIFE pelo WhatsApp.", images: ["/og-prife-brasil.webp"] },
};

export default async function ProductCapturePage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const leaderImage = tenant?.leader_image_url || "/brand/williams-costa-leite.webp";

  return <CapturePage variant="product" ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} leaderImage={leaderImage} />;
}
