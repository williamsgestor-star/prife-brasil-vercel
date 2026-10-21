"use client";

import { useEffect, useState } from "react";

import styles from "./Tools.module.css";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Mostra como instalar quando a página ainda está aberta no navegador (fora do app).
export default function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios" | "other">("hidden");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const timer = window.setTimeout(() => setMode(standalone ? "hidden" : ios ? "ios" : "other"), 0);
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); setMode("android"); };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (mode === "hidden") return null;
  return (
    <section className={styles.install}>
      <strong>Instale no celular</strong>
      {mode === "android" && prompt ? (
        <button type="button" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Instalar o app</button>
      ) : mode === "ios" ? (
        <p>No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
      ) : (
        <p>No Chrome, toque nos <b>3 pontinhos</b> e depois em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>
      )}
    </section>
  );
}
