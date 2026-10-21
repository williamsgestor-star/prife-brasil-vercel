import { headers } from "next/headers";

const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.prife-brasil.com";

// Endereço público do pedido atual: o site principal ou o subdomínio do distribuidor.
export async function requestPublicOrigin() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "")
    .toLowerCase()
    .split(":")[0];
  if (host === "prife-brasil.com") return "https://www.prife-brasil.com";
  if (host === "www.prife-brasil.com" || host.endsWith(".prife-brasil.com")) return `https://${host}`;
  return fallbackOrigin;
}

export function isPrimaryOrigin(origin: string) {
  return origin === fallbackOrigin || origin === "https://www.prife-brasil.com";
}
