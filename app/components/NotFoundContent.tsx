"use client";

import { useEffect, useState } from "react";

const copy = { pt: ["Página não encontrada", "Este endereço não existe ou foi alterado.", "Voltar ao site"], es: ["Página no encontrada", "Esta dirección no existe o fue modificada.", "Volver al sitio"], en: ["Page not found", "This address does not exist or has changed.", "Back to website"] } as const;

export default function NotFoundContent() {
  const [language, setLanguage] = useState<keyof typeof copy>("pt");
  useEffect(() => {
    const timer = window.setTimeout(() => { const saved = localStorage.getItem("prife-language"); if (saved === "pt" || saved === "es" || saved === "en") setLanguage(saved); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [title, text, action] = copy[language];
  return <main className="not-found-page"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil" /><span>404</span><h1>{title}</h1><p>{text}</p><a href="/">{action} <b aria-hidden="true">→</b></a></main>;
}
