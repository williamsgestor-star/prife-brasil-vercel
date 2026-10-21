import type { Metadata } from "next";

import AppHomeButton from "../components/AppHomeButton";
import { requireApprovedAccess } from "../lib/supabase/access";
import { toolsAppMetadata } from "../lib/tools-app";
import PontoVivoAgent from "./PontoVivoAgent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PontoVivo 3D — Assistente de Acupressão Segura",
  description: "Apoio educativo em acupressão e referência corporal 3D dos 361 pontos clássicos, 12 canais principais e 8 vasos extraordinários.",
  robots: { index: false, follow: false }, ...toolsAppMetadata,
};

export default async function PontoVivoPage() {
  const user = await requireApprovedAccess("ponto_vivo", "/ponto-vivo");

  return (
    <>
    <AppHomeButton />
    <PontoVivoAgent
      userDisplayName={user.displayName}
      signOutUrl="/auth/signout"
    />
    </>
  );
}
