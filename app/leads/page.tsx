import type { Metadata } from "next";

import { requireApprovedAccess } from "../lib/supabase/access";
import LeadFinder, { type QuotaStatus } from "./LeadFinder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prospector Prife",
  description: "Pesquisa privada de empresas locais por país, estado, cidade, bairro e segmento.",
  robots: { index: false, follow: false },
  manifest: "/apps/prospector.webmanifest",
  appleWebApp: { capable: true, title: "Prospector", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/apps/prospector-192.png", sizes: "192x192" }], apple: [{ url: "/apps/prospector-180.png", sizes: "180x180" }] },
};

export default async function LeadsPage() {
  const user = await requireApprovedAccess("prospector", "/leads");
  const { data: quotaData } = await user.supabase.rpc("get_prospector_quota");
  const initialQuota = (
    Array.isArray(quotaData) ? quotaData[0] : quotaData
  ) as QuotaStatus | null;

  return (
    <LeadFinder
      userDisplayName={user.displayName}
      signOutUrl="/auth/signout"
      initialQuota={initialQuota}
    />
  );
}
