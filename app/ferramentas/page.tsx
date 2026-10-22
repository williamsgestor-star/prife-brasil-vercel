import type { Metadata } from "next";

import InstallHint from "./InstallHint";
import styles from "./Tools.module.css";
import { requireAuthenticated } from "../lib/supabase/access";
import { toolsAppMetadata } from "../lib/tools-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prife Ferramentas",
  description: "Prospector, CRM, Sala ao vivo e PontoVivo em um só app.",
  robots: { index: false, follow: false },
  ...toolsAppMetadata,
};

const tools = [
  { href: "/leads", name: "Prospector", hint: "Encontrar leads", desc: "Empresas no mapa, prontas para contato", tone: "cyan", icon: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></> },
  { href: "/crm", name: "CRM", hint: "Acompanhar leads", desc: "Funil, retornos e propostas", tone: "blue", icon: <><path d="M5 7h14M5 12h14M5 17h9" /></> },
  { href: "/reuniao", name: "Sala ao vivo", hint: "Reunião", desc: "Vídeo com link, sem instalar nada", tone: "violet", icon: <><rect x="3" y="7" width="12" height="10" rx="2" /><path d="m15 11 6-3v8l-6-3" /></> },
  { href: "/ponto-vivo", name: "PontoVivo", hint: "Agente 3D", desc: "Atendimento com avatar inteligente", tone: "teal", icon: <><path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" /></> },
] as const;

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  return hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export default async function ToolsPage() {
  const user = await requireAuthenticated("/ferramentas");
  const firstName = user.displayName.split(/\s+/)[0] || "";
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  return (
    <main className={styles.page}>
      <span className={styles.aurora} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
          <span className={styles.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</span>
        </div>
        <p>{greeting()}{firstName ? `, ${firstName}` : ""} <span aria-hidden="true">👋</span></p>
        <h1>Suas <em>ferramentas</em></h1>
      </header>
      <nav className={styles.grid} aria-label="Ferramentas">
        {tools.map((tool, i) => (
          <a key={tool.href} href={tool.href} className={`${styles.card} ${styles[tool.tone]}`} style={{ animationDelay: `${120 + i * 90}ms` }}>
            <span className={styles.arrow} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </span>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tool.icon}</svg>
            </span>
            <strong>{tool.name}</strong>
            <small>{tool.hint}</small>
            <span className={styles.desc}>{tool.desc}</span>
          </a>
        ))}
      </nav>
      <InstallHint />
    </main>
  );
}
