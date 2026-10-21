import type { Metadata } from "next";

import CapturePage from "../components/CapturePage";
import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Seja distribuidor Prife: como funciona | Prife Brasil" },
  description: "Entenda como funciona ser distribuidor independente Prife: atividades, requisitos, custos, regras atuais e suporte. Informação clara, sem promessa de renda.",
  alternates: { canonical: "/oportunidade" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Prife Brasil",
    url: "/oportunidade",
    title: "Seja distribuidor Prife: como funciona | Prife Brasil",
    description: "Entenda como funciona ser distribuidor independente Prife: atividades, requisitos, custos, regras atuais e suporte. Informação clara, sem promessa de renda.",
    images: [{ url: "/og-prife-brasil.webp", alt: "Seja distribuidor Prife: como funciona | Prife Brasil" }],
  },
  twitter: { card: "summary_large_image", title: "Seja distribuidor Prife: como funciona | Prife Brasil", description: "Entenda como funciona ser distribuidor independente Prife: atividades, requisitos, custos, regras atuais e suporte. Informação clara, sem promessa de renda.", images: ["/og-prife-brasil.webp"] },
};

export default async function OpportunityCapturePage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  const leaderImage = tenant?.leader_image_url || "/brand/williams-costa-leite.webp";

  return <CapturePage variant="opportunity" ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} leaderImage={leaderImage} />;
}
