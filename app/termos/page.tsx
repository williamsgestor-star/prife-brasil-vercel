import type { Metadata } from "next";

import { currentLegalIdentity } from "../lib/legal-identity";
import LegalDocument from "../privacidade/LegalDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do site Prife Brasil, dos subdomínios e da área exclusiva: produtos, mensalidade, cancelamento, propriedade intelectual e contato.",
  alternates: { canonical: "/termos" },
  openGraph: {
    title: "Termos de uso | Prife Brasil",
    description: "Regras de uso do site Prife Brasil e das ferramentas da área exclusiva.",
    url: "/termos",
  },
};

export default async function TermsPage() {
  return <LegalDocument kind="terms" identity={await currentLegalIdentity()} />;
}
