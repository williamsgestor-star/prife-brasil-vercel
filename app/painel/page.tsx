import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "../lib/supabase/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel Prife", description: "Área privada de gestão do espaço Prife Brasil.", robots: { index: false, follow: false } };

export default async function OwnerPanelPage() {
  const context = await requireAuthenticated("/painel");
  redirect(context.isAdmin ? "/admin/empresas" : "/leads");
}
