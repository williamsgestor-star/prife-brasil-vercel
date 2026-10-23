"use client";

import { useEffect, useState } from "react";
import { useSiteLanguage } from "../lib/site-language";
import styles from "./LaunchPopup.module.css";

// Pop-up de lançamento: aparece toda vez que o site é aberto.
// Para trocar a campanha, troque public/promo/classic-plus.webp e .jpg.

const copy = {
  pt: { alt: "Chegou o mais esperado: iTeraCare Classic Plus já disponível", buy: "Quero o meu", details: "Ver detalhes", close: "Fechar", msg: (n: string) => `Olá, ${n}! Vi no site que o iTeraCare Classic Plus chegou. Quero saber valor e como garantir o meu.` },
  es: { alt: "Llegó el más esperado: iTeraCare Classic Plus ya disponible", buy: "Quiero el mío", details: "Ver detalles", close: "Cerrar", msg: (n: string) => `¡Hola, ${n}! Vi en el sitio que llegó el iTeraCare Classic Plus. Quiero saber el precio y cómo conseguir el mío.` },
  en: { alt: "The most awaited is here: iTeraCare Classic Plus now available", buy: "I want mine", details: "See details", close: "Close", msg: (n: string) => `Hi, ${n}! I saw on the site that the iTeraCare Classic Plus is here. I'd like the price and how to get mine.` },
};

export default function LaunchPopup({ whatsappNumber, distributorName }: { whatsappNumber: string; distributorName: string }) {
  const language = useSiteLanguage();
  const t = copy[language] || copy.pt;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  function seeDetails() {
    close();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  }

  if (!open) return null;
  const href = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(t.msg(distributorName))}`;

  return (
    <div className={styles.backdrop} onClick={close} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true" aria-label={t.alt} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={close} aria-label={t.close}>×</button>
        <div className={styles.stage}>
          <picture>
            <source srcSet="/promo/classic-plus.webp" type="image/webp" />
            <img className={styles.image} src="/promo/classic-plus.jpg" alt={t.alt} width={760} height={1017} />
          </picture>
          <span className={styles.shine} aria-hidden="true" />
          <span className={styles.sparkles} aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--x" as string]: `${(i * 37) % 100}%`, ["--y" as string]: `${(i * 53 + 11) % 100}%`, ["--d" as string]: `${(i % 7) * 0.45}s`, ["--s" as string]: `${4 + (i % 4) * 2}px` }} />)}
          </span>
        </div>
        <div className={styles.actions}>
          <a className={styles.buy} href={href} target="_blank" rel="noopener noreferrer" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.3-4.3a8.5 8.5 0 1 1 15.7-4.4Z" /><path d="M9 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.5c.1.3 0 .5-.2.7l-.4.5c.6 1.1 1.5 2 2.7 2.6l.5-.5c.2-.2.4-.3.7-.2l1.5.7c.3.1.4.3.4.6 0 .9-.7 1.6-1.6 1.6-3.3 0-6-2.7-6-6 0-.4.1-.8.3-1.1Z" /></svg>
            {t.buy}
          </a>
          <button type="button" className={styles.details} onClick={seeDetails}>{t.details}</button>
        </div>
      </div>
    </div>
  );
}
