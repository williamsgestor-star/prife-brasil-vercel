export type SiteSubscription = {
  tenant_id: string;
  enabled: boolean;
  started_at: string | null;
  expires_at: string | null;
  last_paid_at: string | null;
  version: number;
};

export function isSubscriptionInactive(s: SiteSubscription | null | undefined, now: number) {
  if (s?.enabled === false) return true;
  if (!s?.expires_at) return false;
  return Date.parse(s.expires_at) <= now;
}

export function subscriptionStatus(s: SiteSubscription | null | undefined, now: number) {
  if (s?.enabled === false) return "Bloqueado manualmente";
  if (!s?.expires_at) return "Ativo · prazo não definido";
  if (s.started_at && Date.parse(s.started_at) > now) return "Ativo · ciclo futuro";
  const remaining = Date.parse(s.expires_at) - now;
  if (remaining <= 0) return "Bloqueado · mensalidade vencida";
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `Ativo · ${days}d ${hours}h ${minutes}min restantes`;
}

// Only a real subdomain is billable. The primary and deployment hosts are exempt.
export function billableSlug(hostname: string) {
  const host = hostname.toLowerCase().split(":")[0].replace(/^www\./, "");
  const suffix = ".prife-brasil.com";
  if (!host.endsWith(suffix)) return null;
  const slug = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
}
