import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.prife-brasil.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-08");
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [
        `${siteUrl}/og-prife-brasil.webp`,
        `${siteUrl}/products/iteracare-plus.webp`,
        `${siteUrl}/brand/williams-costa-leite.webp`,
      ],
    },
    {
      url: `${siteUrl}/apresentacao`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/produto`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [`${siteUrl}/products/current/iteracare-classic-plus.webp`],
    },
    {
      url: `${siteUrl}/oportunidade`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacidade`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
