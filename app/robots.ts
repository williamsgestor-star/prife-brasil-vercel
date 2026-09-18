import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.prife-brasil.com";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/api/",
    "/admin/",
    "/crm",
    "/leads",
    "/login",
    "/painel",
    "/ponto-vivo",
    "/reuniao",
    "/aguardando-aprovacao",
    "/acesso-indisponivel",
  ];
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade", "/llms.txt"], disallow: privatePaths },
      { userAgent: "Googlebot", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade"], disallow: privatePaths },
      { userAgent: "Bingbot", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade"], disallow: privatePaths },
      { userAgent: "OAI-SearchBot", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade", "/llms.txt"], disallow: privatePaths },
      { userAgent: "ChatGPT-User", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade", "/llms.txt"], disallow: privatePaths },
      { userAgent: "PerplexityBot", allow: ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade", "/llms.txt"], disallow: privatePaths },
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
