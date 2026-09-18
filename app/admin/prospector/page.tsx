import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireAuthenticated } from '../../lib/supabase/access';
import styles from './ProspectorAdmin.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Painel Administrativo do Prospector',
  description: 'Métricas privadas e gestão administrativa do Prospector Prife.',
  robots: { index: false, follow: false },
};

type Funnel = {
  new: number;
  whatsapp: number;
  contacted: number;
  interested: number;
  meeting: number;
  proposal: number;
  client: number;
};

type TenantMetric = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  prospector_enabled: boolean;
  daily_limit: number;
  leads_used: number;
  searches_used: number;
  leads_today: number;
  total_leads: number;
  conversion_rate: number;
  last_activity: string | null;
  today: Omit<Funnel, 'new'>;
  funnel: Funnel;
};

type RecentLead = {
  id: string;
  tenant_slug: string;
  tenant_name: string;
  company_name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  status: keyof Funnel;
  delivered_at: string;
  stage_updated_at: string;
};

type Dashboard = {
  date: string;
  summary: {
    subdomains: number;
    active_subdomains: number;
    prospector_active: number;
    daily_capacity: number;
    quota_used_today: number;
    leads_today: number;
    stored_leads: number;
    whatsapp_today: number;
    contacted_today: number;
    interested_today: number;
    meeting_today: number;
    proposal_today: number;
    clients_today: number;
    searches_today: number;
  };
  funnel: Funnel;
  tenants: TenantMetric[];
  recent: RecentLead[];
};

const funnelOrder: Array<{ key: keyof Funnel; label: string; short: string }> = [
  { key: 'new', label: 'Novo lead', short: 'Novo' },
  { key: 'whatsapp', label: 'WhatsApp', short: 'WhatsApp' },
  { key: 'contacted', label: 'Contato realizado', short: 'Contato' },
  { key: 'interested', label: 'Interessado', short: 'Interessado' },
  { key: 'meeting', label: 'Reunião', short: 'Reunião' },
  { key: 'proposal', label: 'Proposta', short: 'Proposta' },
  { key: 'client', label: 'Cliente', short: 'Cliente' },
];

const stageLabels: Record<keyof Funnel, string> = {
  new: 'Novo lead',
  whatsapp: 'WhatsApp',
  contacted: 'Contato realizado',
  interested: 'Interessado',
  meeting: 'Reunião',
  proposal: 'Proposta',
  client: 'Cliente',
};

function formatDateTime(value: string | null) {
  if (!value) return 'Sem atividade ainda';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Asuncion',
  }).format(new Date(value));
}

function pct(value: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export default async function AdminProspectorPage() {
  const context = await requireAuthenticated('/admin/prospector');
  if (!context.isAdmin) redirect('/leads');

  const { data, error } = await context.supabase.rpc('admin_get_prospector_dashboard');
  const dashboard = (data ?? null) as Dashboard | null;

  if (error || !dashboard) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <Link href='/' className={styles.brand}><img src='/brand/prife-brasil-original.png' alt='Prife Brasil' /></Link>
          <nav><Link href='/admin/acessos'>Acessos</Link><Link href='/admin/empresas'>Empresas</Link><Link href='/leads'>Prospector</Link><a href='/auth/signout'>Sair</a></nav>
        </header>
        <section className={styles.errorBox}><strong>Não foi possível carregar o painel.</strong><span>Tente novamente em instantes.</span></section>
      </main>
    );
  }

  const maxFunnel = Math.max(1, ...funnelOrder.map((item) => dashboard.funnel[item.key]));
  const conversion = dashboard.summary.stored_leads > 0
    ? ((dashboard.funnel.client / dashboard.summary.stored_leads) * 100).toFixed(1)
    : '0.0';

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <header className={styles.header}>
        <Link href='/' className={styles.brand}><img src='/brand/prife-brasil-original.png' alt='Prife Brasil' /></Link>
        <nav>
          <Link href='/admin/acessos'>Acessos</Link>
          <Link href='/admin/empresas'>Empresas</Link>
          <Link className={styles.navActive} href='/admin/prospector'>Painel Prospector</Link>
          <Link href='/leads'>Prospector</Link>
          <a href='/auth/signout'>Sair</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>CENTRAL DE PERFORMANCE COMERCIAL</span>
          <h1>Prospector <em>Command Center</em></h1>
          <p>Acompanhe cada subdomínio, o consumo diário de leads e todo o avanço do funil comercial em uma única visão.</p>
        </div>
        <div className={styles.adminBadge}>
          <small>ACESSO ADMIN</small>
          <strong>Ilimitado</strong>
          <span>Subdomínios: 20 leads/dia</span>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.primaryKpi}>
          <span>LEADS RECEBIDOS HOJE</span>
          <strong>{dashboard.summary.leads_today}</strong>
          <small>{dashboard.summary.quota_used_today} de {dashboard.summary.daily_capacity} cotas utilizadas</small>
          <i><b style={{ width: `${pct(dashboard.summary.quota_used_today, dashboard.summary.daily_capacity)}%` }} /></i>
        </article>
        <article><span>SUBDOMÍNIOS ATIVOS</span><strong>{dashboard.summary.active_subdomains}</strong><small>{dashboard.summary.prospector_active} com Prospector ativo</small></article>
        <article><span>LEADS NO HISTÓRICO</span><strong>{dashboard.summary.stored_leads}</strong><small>Base permanente e anti-duplicação</small></article>
        <article><span>CONTATOS HOJE</span><strong>{dashboard.summary.contacted_today}</strong><small>{dashboard.summary.whatsapp_today} WhatsApps iniciados</small></article>
        <article><span>INTERESSADOS HOJE</span><strong>{dashboard.summary.interested_today}</strong><small>{dashboard.summary.meeting_today} reuniões</small></article>
        <article><span>CLIENTES HOJE</span><strong>{dashboard.summary.clients_today}</strong><small>{conversion}% conversão histórica</small></article>
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>FUNIL GERAL</span><h2>Pipeline comercial</h2></div>
            <b>{dashboard.summary.searches_today} buscas hoje</b>
          </div>
          <div className={styles.funnel}>
            {funnelOrder.map((item, index) => (
              <div className={styles.funnelRow} key={item.key}>
                <span className={styles.funnelIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div className={styles.funnelLabel}><strong>{item.label}</strong><small>{dashboard.funnel[item.key]} leads</small></div>
                <div className={styles.funnelTrack}><i style={{ width: `${Math.max(5, pct(dashboard.funnel[item.key], maxFunnel))}%` }} /></div>
                <strong className={styles.funnelValue}>{dashboard.funnel[item.key]}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.todayPanel}`}>
          <div className={styles.panelHeading}><div><span>HOJE</span><h2>Movimento do funil</h2></div><b>{dashboard.date.split('-').reverse().join('/')}</b></div>
          <div className={styles.todayFlow}>
            <div><span>01</span><strong>{dashboard.summary.leads_today}</strong><small>Leads recebidos</small></div>
            <i>→</i>
            <div><span>02</span><strong>{dashboard.summary.contacted_today}</strong><small>Contatados</small></div>
            <i>→</i>
            <div><span>03</span><strong>{dashboard.summary.interested_today}</strong><small>Interessados</small></div>
            <i>→</i>
            <div><span>04</span><strong>{dashboard.summary.meeting_today}</strong><small>Reuniões</small></div>
            <i>→</i>
            <div><span>05</span><strong>{dashboard.summary.clients_today}</strong><small>Clientes</small></div>
          </div>
          <div className={styles.todayBottom}>
            <div><span>WhatsApp</span><strong>{dashboard.summary.whatsapp_today}</strong></div>
            <div><span>Propostas</span><strong>{dashboard.summary.proposal_today}</strong></div>
            <div><span>Capacidade diária</span><strong>{dashboard.summary.daily_capacity}</strong></div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div><span>DESEMPENHO POR SUBDOMÍNIO</span><h2>Operação comercial</h2></div>
          <b>{dashboard.tenants.length} espaços</b>
        </div>
        <div className={styles.tenantList}>
          {dashboard.tenants.map((tenant) => {
            const usedPct = pct(tenant.leads_used, tenant.daily_limit || 20);
            return (
              <article className={styles.tenantCard} key={tenant.id}>
                <div className={styles.tenantIdentity}>
                  <span className={styles.tenantAvatar}>{tenant.display_name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{tenant.display_name}</strong><small>{tenant.slug}.prife-brasil.com</small></div>
                </div>
                <div className={styles.quotaMini}>
                  <div><span>COTA HOJE</span><strong>{tenant.leads_used}/{tenant.daily_limit}</strong></div>
                  <i><b style={{ width: `${usedPct}%` }} /></i>
                </div>
                <div className={styles.tenantMetric}><span>Recebidos hoje</span><strong>{tenant.leads_today}</strong></div>
                <div className={styles.tenantMetric}><span>Histórico</span><strong>{tenant.total_leads}</strong></div>
                <div className={styles.tenantMetric}><span>Clientes</span><strong>{tenant.funnel.client}</strong></div>
                <div className={styles.tenantMetric}><span>Conversão</span><strong>{tenant.conversion_rate}%</strong></div>
                <div className={styles.tenantStatus}>
                  <span className={tenant.prospector_enabled && tenant.status === 'active' ? styles.online : styles.offline} />
                  <div><strong>{tenant.prospector_enabled && tenant.status === 'active' ? 'Operacional' : 'Bloqueado'}</strong><small>{formatDateTime(tenant.last_activity)}</small></div>
                </div>
                <div className={styles.miniFunnel}>
                  {funnelOrder.map((item) => <span key={item.key} title={`${item.label}: ${tenant.funnel[item.key]}`}><i>{item.short}</i><b>{tenant.funnel[item.key]}</b></span>)}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}><div><span>ATIVIDADE RECENTE</span><h2>Últimos movimentos</h2></div><b>CRM ao vivo</b></div>
        {dashboard.recent.length === 0 ? (
          <div className={styles.empty}>Assim que os subdomínios começarem a prospectar, os últimos leads e mudanças de etapa aparecerão aqui.</div>
        ) : (
          <div className={styles.activityList}>
            {dashboard.recent.map((lead) => (
              <article key={lead.id}>
                <span className={styles.activityDot} />
                <div className={styles.activityMain}><strong>{lead.company_name}</strong><small>{lead.category || 'Empresa'} · {[lead.city, lead.state].filter(Boolean).join(' / ') || 'Local não informado'}</small></div>
                <div className={styles.activityTenant}><strong>{lead.tenant_name}</strong><small>{lead.tenant_slug}.prife-brasil.com</small></div>
                <span className={styles.stagePill}>{stageLabels[lead.status]}</span>
                <time>{formatDateTime(lead.stage_updated_at || lead.delivered_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div><span>PRIFE • PROSPECÇÃO INTELIGENTE</span><strong>Prospector + CRM + WhatsApp + Funil Comercial</strong></div>
        <p>Admin ilimitado · Cada subdomínio recebe até 20 novos leads por dia.</p>
      </footer>
    </main>
  );
}
