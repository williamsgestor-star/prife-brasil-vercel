import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedContext, safeNextPath } from "../lib/supabase/access";
import LoginForm from "./LoginForm";
import styles from "./Login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Prife VIP",
  description: "Acesso seguro às ferramentas exclusivas da Prife Brasil.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const current = await getAuthenticatedContext();
  if (current) redirect(nextPath);

  return (
    <main className={styles.page}>
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      <a className={styles.brand} href="/" aria-label="Voltar ao site Prife Brasil">
        <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
      </a>
      <section className={styles.card}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>ÁREA DE MEMBROS</span>
          <h1>Seu acesso <em>Prife VIP</em> começa aqui.</h1>
          <p>Entre para utilizar o Prospector Exclusivo e o PontoVivo 3D com seus dados protegidos.</p>
          <ul>
            <li>Um acesso por proprietário</li>
            <li>Dados separados por subdomínio</li>
            <li>Liberação após aprovação administrativa</li>
          </ul>
        </div>
        <div className={styles.panel}>
          <span className={styles.panelTag}>LOGIN SEGURO</span>
          <h2>Acesse sua conta</h2>
          <p>Entre com a senha provisória fornecida pelo administrador ou receba um código no seu e-mail.</p>
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
