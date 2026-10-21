import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados em todas as respostas na Vercel.
// Antes eles só existiam em worker/index.ts (hospedagem antiga do ChatGPT Sites)
// e por isso não valiam em produção. A política de conteúdo é propositalmente
// enxuta para não bloquear Google Analytics, vídeos, Supabase nem a sala Daily.co.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co"), display-capture=(self "https://*.daily.co"), geolocation=(), payment=()',
  },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // Mídia pública: guardada por 7 dias no navegador e na Vercel (os arquivos novos ganham nome novo, ex.: -v97).
    const mediaCache = { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" };
    // Scripts e estilos do site: 1 hora, atualizando em segundo plano.
    const appCache = { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" };
    const mediaDirs = ["videos", "travel", "audio", "fonts", "brand", "products", "gallery", "assistant", "ponto-vivo", "pdfs"];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...mediaDirs.map((dir) => ({ source: `/${dir}/:path*`, headers: [mediaCache] })),
      { source: "/src/:path*", headers: [appCache] },
    ];
  },
};

export default nextConfig;
