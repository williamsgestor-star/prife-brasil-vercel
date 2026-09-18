import type { Metadata } from "next";

import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Saiba como a Prife Brasil trata dados pessoais, cookies, contatos, autenticação e solicitações de privacidade.",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    title: "Política de Privacidade | Prife Brasil",
    description: "Informações sobre privacidade, segurança e tratamento de dados no site Prife Brasil.",
    url: "/privacidade",
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
