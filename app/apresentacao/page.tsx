import type { Metadata } from "next";

import { getCurrentTenantSiteProfile, internationalWhatsAppNumber } from "../lib/tenant-site";
import OpportunityPresentation from "./OpportunityPresentation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Apresentação da oportunidade Prife | Prife Brasil" },
  description: "Apresentação interativa do ecossistema Prife: tecnologias de bem-estar, ferramentas do distribuidor independente e como começar.",
  alternates: { canonical: "/apresentacao" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Prife Brasil",
    url: "/apresentacao",
    title: "Apresentação da oportunidade Prife | Prife Brasil",
    description: "Apresentação interativa do ecossistema Prife: tecnologias de bem-estar, ferramentas do distribuidor independente e como começar.",
    images: [{ url: "/og-prife-brasil.jpg", alt: "Apresentação da oportunidade Prife | Prife Brasil" }],
  },
  twitter: { card: "summary_large_image", title: "Apresentação da oportunidade Prife | Prife Brasil", description: "Apresentação interativa do ecossistema Prife: tecnologias de bem-estar, ferramentas do distribuidor independente e como começar.", images: ["/og-prife-brasil.jpg"] },
};

export default async function PresentationPage() {
  const tenant = await getCurrentTenantSiteProfile();
  const ownerName = tenant?.owner_name || "Williams Costa Leite";
  return <OpportunityPresentation ownerName={ownerName} whatsappNumber={internationalWhatsAppNumber(tenant)} />;
}
