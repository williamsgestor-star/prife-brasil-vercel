import type { MetadataRoute } from "next";

import { isPrimaryOrigin, requestPublicOrigin } from "./lib/public-origin";

export const dynamic = "force-dynamic";

// Data da última revisão de conteúdo e SEO. Atualize quando mudar textos das páginas públicas.
const lastModified = new Date("2026-10-21");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestPublicOrigin();
  const home: MetadataRoute.Sitemap[number] = {
    url: origin,
    lastModified,
    changeFrequency: "weekly",
    priority: 1,
    images: [`${origin}/og-prife-brasil.webp`, `${origin}/products/iteracare-plus.webp`],
  };
  // Nos subdomínios só a página inicial é própria; as demais apontam (canonical) para o site principal.
  if (!isPrimaryOrigin(origin)) return [home];
  home.images = [...(home.images || []), `${origin}/brand/williams-costa-leite.webp`];
  return [
    home,
    { url: `${origin}/produto`, lastModified, changeFrequency: "monthly", priority: 0.9, images: [`${origin}/products/current/iteracare-classic-plus.webp`] },
    { url: `${origin}/oportunidade`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/apresentacao`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/privacidade`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
