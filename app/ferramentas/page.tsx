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
  { href: "/leads", name: "Prospector", hint: "Encontrar leads", icon: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></> },
  { href: "/crm", name: "CRM", hint: "Acompanhar leads", icon: <><path d="M5 7h14M5 12h14M5 17h9" /></> },
  { href: "/reuniao", name: "Sala ao vivo", hint: "Reunião", icon: <><rect x="3" y="7" width="12" height="10" rx="2" /><path d="m15 11 6-3v8l-6-3" /></> },
  { href: "/ponto-vivo", name: "PontoVivo", hint: "Agente 3D", icon: <><path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" /></> },
];

export default async function ToolsPage() {
  const user = await requireAuthenticated("/ferramentas");
  const firstName = user.displayName.split(/\s+/)[0] || "";
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
        <p>Olá{firstName ? `, ${firstName}` : ""}</p>
        <h1>Suas ferramentas</h1>
      </header>
      <nav className={styles.grid} aria-label="Ferramentas">
        {tools.map((tool) => (
          <a key={tool.href} href={tool.href} className={styles.card}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tool.icon}</svg>
            </span>
            <strong>{tool.name}</strong>
            <small>{tool.hint}</small>
          </a>
        ))}
      </nav>
      <InstallHint />
    </main>
  );
}
