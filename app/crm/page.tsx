import type { Metadata } from "next";

import { requireApprovedAccess } from "../lib/supabase/access";
import CrmBoard from "./CrmBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CRM de Leads", description: "Área privada para organizar e acompanhar leads do Prospector Prife.", robots: { index: false, follow: false } };

export default async function CrmPage() {
  const user = await requireApprovedAccess("prospector", "/crm");
  const { data } = await user.supabase.rpc("get_prospector_daily_quota");
  const quota = Array.isArray(data) ? data[0] : data;
  return <CrmBoard userDisplayName={user.displayName} tenantId={String(quota?.tenant_id || user.profile?.tenant_id || "")} />;
}
