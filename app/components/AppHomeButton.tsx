"use client";

import { useEffect, useState } from "react";

// Dentro do app instalado não há barra do navegador; este botão volta à tela inicial das ferramentas.
export default function AppHomeButton() {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const timer = window.setTimeout(() => setInstalled(standalone), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!installed) return null;
  return (
    <a
      href="/ferramentas"
      aria-label="Voltar às ferramentas"
      style={{
        position: "fixed",
        left: "max(12px, env(safe-area-inset-left))",
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 2147483000,
        width: 44,
        height: 44,
        display: "grid",
        placeItems: "center",
        borderRadius: 14,
        background: "rgba(3, 20, 43, .86)",
        border: "1px solid rgba(124, 247, 255, .45)",
        boxShadow: "0 8px 22px rgba(0, 0, 0, .35)",
        color: "#7cf7ff",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    </a>
  );
}
