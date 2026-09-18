"use client";

import { useEffect, useState } from "react";

export type SiteLanguage = "pt" | "es" | "en";

function resolveSiteLanguage(value: string | null | undefined): SiteLanguage {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("en")) return "en";
  return "pt";
}

export function useSiteLanguage() {
  const [language, setLanguage] = useState<SiteLanguage>("pt");

  useEffect(() => {
    function syncLanguage() {
      const stored = window.localStorage.getItem("prife-language");
      setLanguage(resolveSiteLanguage(stored || document.documentElement.lang));
    }

    syncLanguage();
    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    window.addEventListener("storage", syncLanguage);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  return language;
}
