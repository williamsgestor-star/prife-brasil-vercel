"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LegalIdentity } from "../lib/legal-identity";
import { privacyCopy, termsCopy, type LegalLanguage } from "../lib/legal-texts";
import styles from "./Privacy.module.css";

export default function LegalDocument({ kind, identity }: { kind: "privacy" | "terms"; identity: LegalIdentity }) {
  const [language, setLanguage] = useState<LegalLanguage>("pt");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("prife-language");
      if (saved === "pt" || saved === "es" || saved === "en") setLanguage(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const copy = kind === "privacy" ? privacyCopy(identity, language) : termsCopy(identity, language);

  return (
    <>
      <a className="skip-link" href="#conteudo-legal">
        {language === "es" ? "Ir al contenido" : language === "en" ? "Skip to content" : "Pular para o conteúdo"}
      </a>
      <main className={styles.page} lang={language === "pt" ? "pt-BR" : language}>
        <header className={styles.header}>
          <Link href="/" aria-label={copy.back}><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /></Link>
          <nav aria-label="Language / Idioma">
            {(["pt", "es", "en"] as LegalLanguage[]).map((item) => (
              <button key={item} type="button" className={language === item ? styles.active : ""} aria-pressed={language === item} onClick={() => { setLanguage(item); window.localStorage.setItem("prife-language", item); }}>{item.toUpperCase()}</button>
            ))}
          </nav>
        </header>
        <article className={styles.card} id="conteudo-legal" tabIndex={-1}>
          <span>{copy.label}</span><h1>{copy.title}</h1><p className={styles.intro}>{copy.intro}</p><small>{copy.updated}</small>
          <div className={styles.sections}>
            {copy.sections.map(([title, text]) => (
              <section key={title}><h2>{title}</h2>{text.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
            ))}
          </div>
          <div className={styles.links}>
            <Link className={styles.back} href="/">{copy.back} <b aria-hidden="true">→</b></Link>
            <Link className={styles.secondary} href={copy.otherHref}>{copy.other}</Link>
            <button type="button" className={styles.secondary} data-cookie-preferences>Cookies</button>
          </div>
          <small className={styles.footerUpdated}>{copy.updated}</small>
        </article>
      </main>
    </>
  );
}
