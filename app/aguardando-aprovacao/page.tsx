import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "../lib/supabase/access";
import AccessRequestForm from "./AccessRequestForm";
import styles from "./Pending.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Liberação de acesso", description: "Solicitação e acompanhamento de acesso ao espaço Prife Brasil.", robots: { index: false, follow: false } };

export default async function PendingPage() {
  const context = await requireAuthenticated("/aguardando-aprovacao");
  if (context.isAdmin) redirect("/admin/acessos");
  if (context.profile?.approval_status === "approved" && context.profile.tenant_id) redirect("/leads");

  const { data: request } = await context.supabase
    .from("access_requests")
    .select("full_name,requested_subdomain_slug,requested_business_name,status")
    .eq("user_id", context.claims.sub)
    .maybeSingle<{ full_name: string | null; requested_subdomain_slug: string | null; requested_business_name: string | null; status: string }>();

  return (
    <main className={styles.page}>
      <a className={styles.brand} href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></a>
      <section className={styles.card}>
        <div className={styles.copy}>
          <span>ACESSO EXCLUSIVO</span>
          <h1>Falta apenas liberar seu <em>espaço Prife.</em></h1>
          <p>Informe os dados do proprietário e o subdomínio desejado. Cada espaço terá um único proprietário e dados completamente separados.</p>
          <div className={styles.steps}><b>01</b><p><strong>Envie sua solicitação</strong><small>Defina o nome e o subdomínio.</small></p><b>02</b><p><strong>Aprovação administrativa</strong><small>A equipe confere e libera o acesso.</small></p><b>03</b><p><strong>Ferramentas disponíveis</strong><small>Prospector e PontoVivo ficam acessíveis.</small></p></div>
        </div>
        <AccessRequestForm
          initialName={request?.full_name ?? context.displayName}
          initialSlug={request?.requested_subdomain_slug ?? ""}
          initialBusiness={request?.requested_business_name ?? ""}
          status={request?.status ?? "pending"}
        />
      </section>
      <a className={styles.signout} href="/auth/signout">Sair da conta</a>
    </main>
  );
}
