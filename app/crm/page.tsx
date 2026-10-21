import type { Metadata } from "next";

import AppHomeButton from "../components/AppHomeButton";
import { requireApprovedAccess } from "../lib/supabase/access";
import { toolsAppMetadata } from "../lib/tools-app";
import CrmBoard from "./CrmBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CRM de Leads", description: "Área privada para organizar e acompanhar leads do Prospector Prife.", robots: { index: false, follow: false }, ...toolsAppMetadata };

export default async function CrmPage() {
  const user = await requireApprovedAccess("prospector", "/crm");
  const { data } = await user.supabase.rpc("get_prospector_daily_quota");
  const quota = Array.isArray(data) ? data[0] : data;
  return <><AppHomeButton /><CrmBoard userDisplayName={user.displayName} tenantId={String(quota?.tenant_id || user.profile?.tenant_id || "")} /></>;
}
