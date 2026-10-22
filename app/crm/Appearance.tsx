"use client";

import { useEffect, useState, type ReactNode } from "react";

import styles from "./Appearance.module.css";

type Size = "0" | "1" | "2";
type Theme = "dark" | "light" | "auto";

const SIZE_KEY = "prife-crm-size";
const THEME_KEY = "prife-crm-theme";

function read<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try { const v = window.localStorage.getItem(key) as T | null; return v && allowed.includes(v) ? v : fallback; } catch { return fallback; }
}
function apply(size: Size, theme: Theme) {
  const root = document.documentElement;
  root.dataset.crmSize = size;
  root.dataset.crmTheme = theme;
}

// Botão "Aa": tamanho das letras e tema claro/escuro do CRM, salvo neste aparelho.
export default function Appearance() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>("0");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const s = read<Size>(SIZE_KEY, "0", ["0", "1", "2"]);
    const t = read<Theme>(THEME_KEY, "dark", ["dark", "light", "auto"]);
    apply(s, t);
    const timer = window.setTimeout(() => { setSize(s); setTheme(t); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pickSize(next: Size) { setSize(next); apply(next, theme); try { window.localStorage.setItem(SIZE_KEY, next); } catch { /* sem armazenamento */ } }
  function pickTheme(next: Theme) { setTheme(next); apply(size, next); try { window.localStorage.setItem(THEME_KEY, next); } catch { /* sem armazenamento */ } }

  const sizes: Array<[Size, string, string]> = [["0", "Normal", "18px"], ["1", "Grande", "22px"], ["2", "Maior", "26px"]];
  const themes: Array<[Theme, string, ReactNode]> = [
    ["light", "Claro", <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>],
    ["dark", "Escuro", <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></>],
    ["auto", "Automático", <><rect x="2" y="4" width="14" height="10" rx="2" /><path d="M6 18h6M9 14v4" /><rect x="17" y="9" width="5" height="11" rx="1.5" /></>],
  ];

  return <>
    <button type="button" className={styles.trigger} onClick={() => setOpen(true)} aria-label="Texto e aparência" title="Texto e aparência">A<span>a</span></button>
    {open ? <div className={styles.backdrop} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="appearance-title">
        <header><h2 id="appearance-title">Texto e aparência</h2><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}>×</button></header>
        <p>Escolha o tamanho das letras do CRM neste aparelho. Vale para todas as telas.</p>
        <div className={styles.options}>
          {sizes.map(([value, label, font]) => <button key={value} type="button" aria-pressed={size === value} className={size === value ? styles.active : ""} onClick={() => pickSize(value)}><b style={{ fontSize: font }}>Aa</b><span>{label}</span></button>)}
        </div>
        <h3>Aparência</h3>
        <div className={styles.options}>
          {themes.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={theme === value} className={theme === value ? styles.active : ""} onClick={() => pickTheme(value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg><span>{label}</span></button>)}
        </div>
        <small>Automático segue o modo claro ou escuro do celular ou computador.</small>
        <div className={styles.footer}><button type="button" className={styles.done} onClick={() => setOpen(false)}>✓ Pronto</button></div>
      </section>
    </div> : null}
  </>;
}
