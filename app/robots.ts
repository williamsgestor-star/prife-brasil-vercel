import type { MetadataRoute } from "next";

import { requestPublicOrigin } from "./lib/public-origin";

export const dynamic = "force-dynamic";

const publicPaths = ["/", "/produto", "/oportunidade", "/apresentacao", "/privacidade", "/llms.txt"];
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

// Robôs de busca e de assistentes de IA (ChatGPT, Claude, Perplexity, Gemini, Copilot) podem ler as páginas públicas.
const searchAndAiBots = [
  "Googlebot",
  "Bingbot",
  "Google-Extended",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestPublicOrigin();
  return {
    rules: [
      { userAgent: "*", allow: publicPaths, disallow: privatePaths },
      { userAgent: searchAndAiBots, allow: publicPaths, disallow: privatePaths },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
