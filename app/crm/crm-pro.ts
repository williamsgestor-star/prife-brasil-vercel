// Recursos avançados do CRM: tudo calculado no aparelho, a partir dos leads que a API já devolve.
// Nada aqui grava no banco além das mesmas atualizações que o quadro já fazia (etapa e próximo contato).

export type QuickFilter = "all" | "overdue" | "today" | "hot" | "cold" | "nofollow";
export type SortKey = "recent" | "score" | "followup" | "name";
export type FollowUpState = "overdue" | "today" | "future" | null;

type ProLead = {
  company_name: string; segment: string | null; phone: string; whatsapp: string | null; email: string | null;
  address: string | null; website: string | null; status: string; notes: string | null; lead_score: number;
  next_follow_up_at: string | null; created_at: string; last_contact_at?: string | null;
};

const DAY = 86_400_000;
const closedStages = new Set(["cliente", "perdido"]);
export const COLD_AFTER_DAYS = 7;

export function followUpState(value: string | null, now: number): FollowUpState {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  if (time < now) return "overdue";
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return time <= end.getTime() ? "today" : "future";
}

export function daysSince(value: string | null | undefined, now: number) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.floor((now - time) / DAY));
}

export function isCold(lead: ProLead, now: number) {
  if (lead.status === "novo" || closedStages.has(lead.status)) return false;
  if (followUpState(lead.next_follow_up_at, now) === "future") return false;
  const idle = daysSince(lead.last_contact_at || lead.created_at, now);
  return idle !== null && idle >= COLD_AFTER_DAYS;
}

export function matchesQuickFilter(lead: ProLead, filter: QuickFilter, now: number) {
  switch (filter) {
    case "overdue": return !closedStages.has(lead.status) && followUpState(lead.next_follow_up_at, now) === "overdue";
    case "today": return followUpState(lead.next_follow_up_at, now) === "today";
    case "hot": return lead.lead_score >= 70;
    case "cold": return isCold(lead, now);
    case "nofollow": return !lead.next_follow_up_at && !closedStages.has(lead.status);
    default: return true;
  }
}

export function sortLeads<T extends ProLead>(list: T[], key: SortKey) {
  if (key === "recent") return list; // a API já entrega do mais novo para o mais antigo
  const copy = [...list];
  if (key === "score") copy.sort((a, b) => b.lead_score - a.lead_score);
  if (key === "name") copy.sort((a, b) => a.company_name.localeCompare(b.company_name, "pt-BR", { sensitivity: "base" }));
  if (key === "followup") copy.sort((a, b) => {
    const ta = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Infinity;
    const tb = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Infinity;
    return ta - tb;
  });
  return copy;
}

export function scoreTier(score: number): "hot" | "warm" | "cool" {
  return score >= 70 ? "hot" : score >= 40 ? "warm" : "cool";
}

export function addDaysAt(days: number, hour = 9) {
  const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // evita fórmulas ao abrir no Excel
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadLeadsCsv(leads: ProLead[], stageName: (status: string) => string, headers: string[]) {
  const rows = leads.map((lead) => [
    lead.company_name, lead.segment, lead.phone, lead.whatsapp, lead.email, lead.address, lead.website,
    stageName(lead.status), lead.lead_score,
    lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString("pt-BR") : "",
    lead.notes, new Date(lead.created_at).toLocaleDateString("pt-BR"),
  ]);
  const body = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `crm-prife-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try { const value = window.localStorage.getItem(key) as T | null; return value && allowed.includes(value) ? value : fallback; } catch { return fallback; }
}
export function savePref(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* sem armazenamento */ }
}

export const proCopy = {
  pt: {
    today: "Agenda de hoje", filters: { all: "Todos", overdue: "Atrasados", today: "Para hoje", hot: "Prioridade alta", cold: "Esfriando", nofollow: "Sem próximo contato" },
    coldHint: `Em negociação e sem contato há ${COLD_AFTER_DAYS}+ dias`, segment: "Segmento", allSegments: "Todos os segmentos",
    sort: "Ordenar", sorts: { recent: "Mais recentes", score: "Maior pontuação", followup: "Próximo contato", name: "Nome (A–Z)" },
    export: "Exportar CSV", clear: "Limpar filtros", showing: "{n} de {total} leads", funnel: "Funil de vendas",
    overdue: "Atrasado", todayAt: "Hoje {time}", on: "{date}", age: (d: number) => d === 0 ? "entrou hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`,
    quick: "Agendar contato:", tomorrow: "Amanhã", in3: "Em 3 dias", in7: "Em 1 semana", call: "Ligar", dragHint: "Dica: arraste os cartões entre as etapas",
    moved: "Lead movido para {stage}.", scheduled: "Próximo contato agendado.", nothing: "Nenhum lead com esse filtro.",
    csvHeaders: ["Empresa", "Segmento", "Telefone", "WhatsApp", "E-mail", "Endereço", "Site", "Etapa", "Pontuação", "Próximo contato", "Anotações", "Criado em"],
  },
  es: {
    today: "Agenda de hoy", filters: { all: "Todos", overdue: "Atrasados", today: "Para hoy", hot: "Alta prioridad", cold: "Enfriándose", nofollow: "Sin próximo contacto" },
    coldHint: `En negociación y sin contacto hace ${COLD_AFTER_DAYS}+ días`, segment: "Segmento", allSegments: "Todos los segmentos",
    sort: "Ordenar", sorts: { recent: "Más recientes", score: "Mayor puntuación", followup: "Próximo contacto", name: "Nombre (A–Z)" },
    export: "Exportar CSV", clear: "Limpiar filtros", showing: "{n} de {total} leads", funnel: "Embudo de ventas",
    overdue: "Atrasado", todayAt: "Hoy {time}", on: "{date}", age: (d: number) => d === 0 ? "entró hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`,
    quick: "Agendar contacto:", tomorrow: "Mañana", in3: "En 3 días", in7: "En 1 semana", call: "Llamar", dragHint: "Consejo: arrastra las tarjetas entre etapas",
    moved: "Lead movido a {stage}.", scheduled: "Próximo contacto agendado.", nothing: "Ningún lead con ese filtro.",
    csvHeaders: ["Empresa", "Segmento", "Teléfono", "WhatsApp", "E-mail", "Dirección", "Sitio", "Etapa", "Puntuación", "Próximo contacto", "Notas", "Creado el"],
  },
  en: {
    today: "Today's agenda", filters: { all: "All", overdue: "Overdue", today: "Due today", hot: "High priority", cold: "Going cold", nofollow: "No next contact" },
    coldHint: `In progress with no contact for ${COLD_AFTER_DAYS}+ days`, segment: "Segment", allSegments: "All segments",
    sort: "Sort", sorts: { recent: "Newest", score: "Highest score", followup: "Next contact", name: "Name (A–Z)" },
    export: "Export CSV", clear: "Clear filters", showing: "{n} of {total} leads", funnel: "Sales funnel",
    overdue: "Overdue", todayAt: "Today {time}", on: "{date}", age: (d: number) => d === 0 ? "added today" : d === 1 ? "1 day ago" : `${d} days ago`,
    quick: "Schedule contact:", tomorrow: "Tomorrow", in3: "In 3 days", in7: "In 1 week", call: "Call", dragHint: "Tip: drag cards between stages",
    moved: "Lead moved to {stage}.", scheduled: "Next contact scheduled.", nothing: "No leads match this filter.",
    csvHeaders: ["Company", "Segment", "Phone", "WhatsApp", "Email", "Address", "Website", "Stage", "Score", "Next contact", "Notes", "Created"],
  },
};
