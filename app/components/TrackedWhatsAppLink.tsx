"use client";

import type { ReactNode } from "react";

export default function TrackedWhatsAppLink({
  href,
  intent,
  location,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  intent: "products" | "opportunity" | "support";
  location: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  function trackClick() {
    window.dispatchEvent(new CustomEvent("prife:analytics", {
      detail: { event: "whatsapp_click", intent, location },
    }));
  }

  return (
    <a
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={trackClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
