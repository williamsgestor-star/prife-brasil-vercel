"use client";

import { useEffect, useState } from "react";

import { useSiteLanguage } from "../lib/site-language";
import GoogleAnalytics from "./GoogleAnalytics";
import styles from "./CookieConsent.module.css";

// Aviso de cookies (LGPD): o Google Analytics só carrega depois que a pessoa clica em "Aceitar".
// A escolha fica guardada neste navegador e pode ser trocada pelo link "Cookies" do rodapé.
export const COOKIE_CONSENT_KEY = "prife-cookie-consent";
const CONSENT_VERSION = "2026-11-08";

type Choice = "accepted" | "rejected";

const copy = {
  pt: {
    title: "Cookies e métricas",
    text: "Usamos armazenamento técnico para o site funcionar (idioma e sessão). Com a sua permissão, também usamos o Google Analytics para medir visitas de forma agregada. Você pode mudar a escolha quando quiser pelo link \"Cookies\" no rodapé.",
    policy: "Política de privacidade",
    accept: "Aceitar",
    reject: "Recusar",
  },
  es: {
    title: "Cookies y métricas",
    text: "Usamos almacenamiento técnico para que el sitio funcione (idioma y sesión). Con su permiso, también usamos Google Analytics para medir visitas de forma agregada. Puede cambiar su elección cuando quiera en el enlace \"Cookies\" del pie de página.",
    policy: "Política de privacidad",
    accept: "Aceptar",
    reject: "Rechazar",
  },
  en: {
    title: "Cookies and analytics",
    text: "We use technical storage to make the site work (language and session). With your permission, we also use Google Analytics to measure visits in aggregate. You can change your choice at any time using the \"Cookies\" link in the footer.",
    policy: "Privacy policy",
    accept: "Accept",
    reject: "Reject",
  },
};

function readChoice(): Choice | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: string; version?: string };
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed.choice === "accepted" || parsed.choice === "rejected" ? parsed.choice : null;
  } catch {
    return null;
  }
}

function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  document.cookie.split(";").map((item) => item.split("=")[0].trim()).filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid").forEach((name) => {
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
    });
  });
}

export default function CookieConsent({ measurementId }: { measurementId?: string }) {
  const language = useSiteLanguage();
  const t = copy[language] || copy.pt;
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readChoice();
      setChoice(saved);
      setOpen(!saved);
    }, 0);
    // Qualquer elemento com data-cookie-preferences (ex.: link do rodapé) reabre o aviso.
    const reopen = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.("[data-cookie-preferences]");
      if (!target) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener("click", reopen);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", reopen);
    };
  }, []);

  function decide(next: Choice) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ choice: next, version: CONSENT_VERSION, decidedAt: new Date().toISOString() }));
    } catch { /* sem armazenamento: a escolha vale só nesta visita */ }
    const revoked = choice === "accepted" && next === "rejected";
    setChoice(next);
    setOpen(false);
    if (next === "rejected") clearAnalyticsCookies();
    // O script do Google já carregado não é descarregado: recarrega a página para parar a coleta.
    if (revoked) window.location.reload();
  }

  return (
    <>
      {choice === "accepted" && <GoogleAnalytics measurementId={measurementId} />}
      {open && (
        <section className={styles.banner} role="region" aria-label={t.title}>
          <div className={styles.copy}>
            <strong>{t.title}</strong>
            <p>{t.text} <a href="/privacidade">{t.policy}</a></p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.reject} onClick={() => decide("rejected")}>{t.reject}</button>
            <button type="button" className={styles.accept} onClick={() => decide("accepted")}>{t.accept}</button>
          </div>
        </section>
      )}
    </>
  );
}
