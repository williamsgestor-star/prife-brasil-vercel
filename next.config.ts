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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
