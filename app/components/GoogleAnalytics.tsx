"use client";

import Script from "next/script";
import { useEffect } from "react";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export default function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const id = String(measurementId || "").trim();

  useEffect(() => {
    if (!/^G-[A-Z0-9]+$/i.test(id)) return;
    const forwardEvent = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      const { event: eventName, ...parameters } = detail;
      if (typeof eventName !== "string") return;
      (window as AnalyticsWindow).gtag?.("event", eventName, parameters);
    };
    window.addEventListener("prife:analytics", forwardEvent);
    return () => window.removeEventListener("prife:analytics", forwardEvent);
  }, [id]);

  if (!/^G-[A-Z0-9]+$/i.test(id)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="prife-google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${id}',{anonymize_ip:true,send_page_view:true});`}
      </Script>
    </>
  );
}
