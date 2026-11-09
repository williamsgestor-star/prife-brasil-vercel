import type { Metadata } from "next";

import { currentLegalIdentity } from "../lib/legal-identity";
import LegalDocument from "./LegalDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Saiba como a Prife Brasil trata dados pessoais, cookies, contatos, CRM, prazos de guarda e como exercer seus direitos pela LGPD.",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    title: "Política de Privacidade | Prife Brasil",
    description: "Informações sobre privacidade, segurança e tratamento de dados no site Prife Brasil.",
    url: "/privacidade",
  },
};

export default async function PrivacyPage() {
  return <LegalDocument kind="privacy" identity={await currentLegalIdentity()} />;
}
