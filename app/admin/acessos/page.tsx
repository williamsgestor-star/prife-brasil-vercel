import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "../../lib/supabase/access";
import AdminAccessPanel from "./AdminAccessPanel";
import styles from "./Admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administração de acessos", description: "Área privada para aprovação e gestão de acessos Prife Brasil.", robots: { index: false, follow: false } };

export default async function AdminAccessPage() {
  const context = await requireAuthenticated("/admin/acessos");
  if (!context.isAdmin) redirect("/aguardando-aprovacao");

  const { data } = await context.supabase
    .from("access_requests")
    .select("id,email,full_name,requested_subdomain_slug,requested_business_name,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className={styles.page}>
      <header><a href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a><nav><Link href="/admin/empresas">Empresas</Link><Link href="/leads">Prospector</Link><Link href="/ponto-vivo">PontoVivo</Link><a href="/auth/signout">Sair</a></nav></header>
      <AdminAccessPanel initialRequests={(data ?? []) as never[]} />
    </main>
  );
}
