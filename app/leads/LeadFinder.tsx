"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useSiteLanguage, type SiteLanguage } from "../lib/site-language";
import styles from "./LeadFinder.module.css";

type Lead = {
  sourceId: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  sourceUrl: string;
  provider: string;
  distanceKm?: number;
  country?: string;
  deliveredAt?: string;
};

type SearchMeta = {
  category: string;
  location: string;
  radius: number;
  returned: number;
  attribution: string;
  provider: string;
};

export type QuotaStatus = {
  tenant_id: string;
  monthly_limit: number | null;
  used: number;
  remaining: number | null;
  global_limit?: number;
  global_used?: number;
  global_remaining?: number;
  period_start: string;
};

type SearchResponse = {
  leads?: Lead[];
  meta?: SearchMeta;
  quota?: QuotaStatus;
  error?: string;
  historySaved?: boolean;
};

type HistoryResponse = {
  leads?: Lead[];
  error?: string;
};

const segmentSuggestions: Record<SiteLanguage, string[]> = {
  pt: ["Médicos e consultórios", "Clínicas e centros de saúde", "Barbearias", "Restaurantes", "Cafeterias", "Academias", "Fisioterapia", "Clínicas odontológicas", "Nutricionistas", "Estética e salões", "Farmácias", "Hotéis e pousadas", "Pet shops e veterinárias", "Oficinas automotivas", "Imobiliárias", "Contabilidade", "Advocacia"],
  es: ["Médicos y consultorios", "Clínicas y centros de salud", "Barberías", "Restaurantes", "Cafeterías", "Gimnasios", "Fisioterapia", "Clínicas odontológicas", "Nutricionistas", "Estética y salones", "Farmacias", "Hoteles y posadas", "Tiendas de mascotas y veterinarias", "Talleres mecánicos", "Inmobiliarias", "Contabilidad", "Abogados"],
  en: ["Doctors and medical offices", "Clinics and health centers", "Barbershops", "Restaurants", "Coffee shops", "Gyms", "Physiotherapy", "Dental clinics", "Nutritionists", "Beauty salons and spas", "Pharmacies", "Hotels and guest houses", "Pet shops and veterinarians", "Auto repair shops", "Real estate agencies", "Accounting", "Law firms"],
};

const countries = ["br", "py", "ar", "uy", "bo"] as const;
const countryLabels: Record<SiteLanguage, Record<(typeof countries)[number], string>> = {
  pt: { br: "Brasil", py: "Paraguai", ar: "Argentina", uy: "Uruguai", bo: "Bolívia" },
  es: { br: "Brasil", py: "Paraguay", ar: "Argentina", uy: "Uruguay", bo: "Bolivia" },
  en: { br: "Brazil", py: "Paraguay", ar: "Argentina", uy: "Uruguay", bo: "Bolivia" },
};

const simulatorCopy: Record<SiteLanguage, {
  eyebrow: string;
  title: string;
  averageSale: string;
  commission: string;
  salesPerMonth: string;
  monthlyCommission: string;
  monthlyVolume: string;
  projectionMonths: string;
  projection: string;
  month: string;
  months: string;
  disclaimer: string;
  currencyNote: string;
}> = {
  pt: {
    eyebrow: "SIMULAÇÃO PERSONALIZADA",
    title: "Calcule sua projeção de ganhos",
    averageSale: "Valor médio por venda (R$)",
    commission: "Comissão",
    salesPerMonth: "Vendas por mês",
    monthlyCommission: "Comissão mensal estimada",
    monthlyVolume: "Volume mensal de vendas",
    projectionMonths: "Meses da projeção",
    projection: "Projeção",
    month: "mês",
    months: "meses",
    disclaimer: "Simulação ilustrativa. Os resultados dependem das regras comerciais aplicáveis.",
    currencyNote: "Valores em Real brasileiro (BRL)",
  },
  es: {
    eyebrow: "SIMULACIÓN PERSONALIZADA",
    title: "Calcula tu proyección de ganancias",
    averageSale: "Valor medio por venta (R$)",
    commission: "Comisión",
    salesPerMonth: "Ventas por mes",
    monthlyCommission: "Comisión mensual estimada",
    monthlyVolume: "Volumen mensual de ventas",
    projectionMonths: "Meses de proyección",
    projection: "Proyección",
    month: "mes",
    months: "meses",
    disclaimer: "Simulación ilustrativa. Los resultados dependen de las reglas comerciales aplicables.",
    currencyNote: "Valores en real brasileño (BRL)",
  },
  en: {
    eyebrow: "PERSONALIZED SIMULATION",
    title: "Calculate your earnings projection",
    averageSale: "Average sale value (R$)",
    commission: "Commission",
    salesPerMonth: "Sales per month",
    monthlyCommission: "Estimated monthly commission",
    monthlyVolume: "Monthly sales volume",
    projectionMonths: "Projection months",
    projection: "Projection",
    month: "month",
    months: "months",
    disclaimer: "Illustrative simulation. Results depend on the applicable commercial rules.",
    currencyNote: "Values in Brazilian real (BRL)",
  },
};

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const locationLabels: Record<SiteLanguage, Record<string, {
  region: string;
  neighborhood: string;
  cityPlaceholder: string;
  regionPlaceholder: string;
  neighborhoodPlaceholder: string;
}>> = {
  pt: {
    br: { region: "Estado", neighborhood: "Bairro", cityPlaceholder: "Ex.: Cascavel", regionPlaceholder: "Ex.: Paraná", neighborhoodPlaceholder: "Ex.: Centro" },
    py: { region: "Departamento", neighborhood: "Bairro ou zona", cityPlaceholder: "Ex.: Ciudad del Este", regionPlaceholder: "Ex.: Alto Paraná", neighborhoodPlaceholder: "Ex.: Área 1" },
    ar: { region: "Província", neighborhood: "Bairro", cityPlaceholder: "Ex.: Córdoba", regionPlaceholder: "Ex.: Córdoba", neighborhoodPlaceholder: "Ex.: Nueva Córdoba" },
    uy: { region: "Departamento", neighborhood: "Bairro", cityPlaceholder: "Ex.: Montevidéu", regionPlaceholder: "Ex.: Montevidéu", neighborhoodPlaceholder: "Ex.: Pocitos" },
    bo: { region: "Departamento", neighborhood: "Bairro ou zona", cityPlaceholder: "Ex.: Santa Cruz de la Sierra", regionPlaceholder: "Ex.: Santa Cruz", neighborhoodPlaceholder: "Ex.: Equipetrol" },
  },
  es: {
    br: { region: "Estado", neighborhood: "Barrio", cityPlaceholder: "Ej.: Cascavel", regionPlaceholder: "Ej.: Paraná", neighborhoodPlaceholder: "Ej.: Centro" },
    py: { region: "Departamento", neighborhood: "Barrio o zona", cityPlaceholder: "Ej.: Ciudad del Este", regionPlaceholder: "Ej.: Alto Paraná", neighborhoodPlaceholder: "Ej.: Área 1" },
    ar: { region: "Provincia", neighborhood: "Barrio", cityPlaceholder: "Ej.: Córdoba", regionPlaceholder: "Ej.: Córdoba", neighborhoodPlaceholder: "Ej.: Nueva Córdoba" },
    uy: { region: "Departamento", neighborhood: "Barrio", cityPlaceholder: "Ej.: Montevideo", regionPlaceholder: "Ej.: Montevideo", neighborhoodPlaceholder: "Ej.: Pocitos" },
    bo: { region: "Departamento", neighborhood: "Barrio o zona", cityPlaceholder: "Ej.: Santa Cruz de la Sierra", regionPlaceholder: "Ej.: Santa Cruz", neighborhoodPlaceholder: "Ej.: Equipetrol" },
  },
  en: {
    br: { region: "State", neighborhood: "Neighborhood", cityPlaceholder: "E.g. Cascavel", regionPlaceholder: "E.g. Paraná", neighborhoodPlaceholder: "E.g. Centro" },
    py: { region: "Department", neighborhood: "Neighborhood or area", cityPlaceholder: "E.g. Ciudad del Este", regionPlaceholder: "E.g. Alto Paraná", neighborhoodPlaceholder: "E.g. Área 1" },
    ar: { region: "Province", neighborhood: "Neighborhood", cityPlaceholder: "E.g. Córdoba", regionPlaceholder: "E.g. Córdoba", neighborhoodPlaceholder: "E.g. Nueva Córdoba" },
    uy: { region: "Department", neighborhood: "Neighborhood", cityPlaceholder: "E.g. Montevideo", regionPlaceholder: "E.g. Montevideo", neighborhoodPlaceholder: "E.g. Pocitos" },
    bo: { region: "Department", neighborhood: "Neighborhood or area", cityPlaceholder: "E.g. Santa Cruz de la Sierra", regionPlaceholder: "E.g. Santa Cruz", neighborhoodPlaceholder: "E.g. Equipetrol" },
  },
};

const leadCopy = {
  pt: {
    back: "Voltar ao site Prife Brasil", area: "Área autenticada", signOut: "Sair",
    eyebrow: "CAPTAÇÃO DE LEADS LOCAIS", titleBefore: "Encontre empresas e fale pelo", titleHighlight: "WhatsApp.",
    description: "Informe a cidade e, se desejar, um segmento para encontrar negócios com telefone público e iniciar sua prospecção.",
    steps: ["Escolha o segmento (opcional)", "Informe a região", "Ligue ou abra o WhatsApp"],
    newSearch: "NOVA PESQUISA", define: "Defina seu público", monthly: "FRANQUIA MENSAL", used: "leads utilizados", available: "disponíveis",
    country: "País", city: "Cidade", required: "OBRIGATÓRIO", segment: "Segmento", optional: "OPCIONAL", segmentPlaceholder: "Deixe vazio para buscar todos",
    searching: "Buscando empresas…", quotaUsed: "Sua franquia mensal de 100 leads foi atingida. A franquia será renovada automaticamente no início do próximo mês.", search: "Buscar nessa área",
    errorTitle: "Não foi possível concluir a pesquisa.", loadingSmall: "CONSULTANDO EMPRESAS LOCAIS", loadingTitle: "Localizando empresas na região…", loadingText: "Isso normalmente leva alguns segundos.",
    ready: "PRONTO PARA COMEÇAR", emptyTitle: "Seus leads aparecerão aqui.", emptyText: "Informe a cidade e, se quiser, escolha um segmento. Com o campo vazio, a busca encontra empresas variadas na região.",
    features: ["Segmento opcional", "Busca regional", "Exportação em CSV"], result: "RESULTADO DA PESQUISA", companies: "empresas encontradas", export: "Exportar CSV",
    importCrm: "Importar para o CRM", importingCrm: "Importando…", openCrm: "Abrir CRM", importSuccess: "leads enviados ao CRM.", importError: "Não foi possível importar os leads.", history: "Histórico de leads", savedLeads: "leads salvos", viewHistory: "Ver histórico", historyLoadError: "Não foi possível carregar o histórico.",
    total: "Total", phoneCount: "Com telefone", whatsappAccess: "Acesso ao WhatsApp", websiteCount: "Com site", noResults: "Nenhuma empresa com telefone ou WhatsApp foi encontrada.", noResultsText: "Confira a cidade, amplie a área ou tente outro segmento.",
    address: "Endereço", phone: "Telefone", source: "Fonte", unavailable: "Não informado", call: "Ligar", openSite: "Abrir site", map: "Ver no mapa",
    footerSmall: "PRIFE • PROSPECÇÃO INTELIGENTE", footerTitle: "Dados públicos, decisões mais rápidas.", dataSource: "FONTE DOS DADOS", privacy: "Valide as informações comerciais e respeite as regras de privacidade antes do contato.", backSite: "Voltar ao site",
    apiFallback: "O serviço de busca não respondeu corretamente. Tente novamente.", searchError: "Não foi possível realizar a busca.", timeout: "A busca demorou demais. Tente novamente em alguns segundos.", allSegments: "Todos os segmentos",
    csv: ["Nome", "Nicho", "Telefone", "WhatsApp", "Site", "Endereço", "Fonte", "Link da fonte"],
  },
  es: {
    back: "Volver al sitio Prife Brasil", area: "Área autenticada", signOut: "Salir",
    eyebrow: "CAPTACIÓN DE LEADS LOCALES", titleBefore: "Encuentra empresas y habla por", titleHighlight: "WhatsApp.",
    description: "Indica la ciudad y, si deseas, un segmento para encontrar negocios con teléfono público e iniciar tu prospección.",
    steps: ["Elige el segmento (opcional)", "Indica la región", "Llama o abre WhatsApp"],
    newSearch: "NUEVA BÚSQUEDA", define: "Define tu público", monthly: "CUOTA MENSUAL", used: "leads utilizados", available: "disponibles",
    country: "País", city: "Ciudad", required: "OBLIGATORIO", segment: "Segmento", optional: "OPCIONAL", segmentPlaceholder: "Déjalo vacío para buscar todos",
    searching: "Buscando empresas…", quotaUsed: "Tu cuota mensual de 100 leads fue alcanzada. La cuota se renovará automáticamente al inicio del próximo mes.", search: "Buscar en esta zona",
    errorTitle: "No fue posible completar la búsqueda.", loadingSmall: "CONSULTANDO EMPRESAS LOCALES", loadingTitle: "Localizando empresas en la región…", loadingText: "Esto normalmente tarda unos segundos.",
    ready: "LISTO PARA COMENZAR", emptyTitle: "Tus leads aparecerán aquí.", emptyText: "Indica la ciudad y, si quieres, elige un segmento. Con el campo vacío, la búsqueda encuentra empresas variadas en la región.",
    features: ["Segmento opcional", "Búsqueda regional", "Exportación CSV"], result: "RESULTADO DE LA BÚSQUEDA", companies: "empresas encontradas", export: "Exportar CSV",
    importCrm: "Importar al CRM", importingCrm: "Importando…", openCrm: "Abrir CRM", importSuccess: "leads enviados al CRM.", importError: "No fue posible importar los leads.", history: "Historial de leads", savedLeads: "leads guardados", viewHistory: "Ver historial", historyLoadError: "No fue posible cargar el historial.",
    total: "Total", phoneCount: "Con teléfono", whatsappAccess: "Acceso a WhatsApp", websiteCount: "Con sitio web", noResults: "No se encontraron empresas con teléfono o WhatsApp.", noResultsText: "Comprueba la ciudad, amplía el área o prueba otro segmento.",
    address: "Dirección", phone: "Teléfono", source: "Fuente", unavailable: "No informado", call: "Llamar", openSite: "Abrir sitio", map: "Ver en el mapa",
    footerSmall: "PRIFE • PROSPECCIÓN INTELIGENTE", footerTitle: "Datos públicos, decisiones más rápidas.", dataSource: "FUENTE DE LOS DATOS", privacy: "Valida la información comercial y respeta las normas de privacidad antes del contacto.", backSite: "Volver al sitio",
    apiFallback: "El servicio de búsqueda no respondió correctamente. Inténtalo de nuevo.", searchError: "No fue posible realizar la búsqueda.", timeout: "La búsqueda tardó demasiado. Inténtalo de nuevo en unos segundos.", allSegments: "Todos los segmentos",
    csv: ["Nombre", "Segmento", "Teléfono", "WhatsApp", "Sitio", "Dirección", "Fuente", "Enlace de la fuente"],
  },
  en: {
    back: "Back to Prife Brasil website", area: "Authenticated area", signOut: "Sign out",
    eyebrow: "LOCAL LEAD PROSPECTING", titleBefore: "Find businesses and connect on", titleHighlight: "WhatsApp.",
    description: "Enter a city and, if desired, a segment to find businesses with public phone numbers and start prospecting.",
    steps: ["Choose a segment (optional)", "Enter the region", "Call or open WhatsApp"],
    newSearch: "NEW SEARCH", define: "Define your audience", monthly: "MONTHLY ALLOWANCE", used: "leads used", available: "available",
    country: "Country", city: "City", required: "REQUIRED", segment: "Segment", optional: "OPTIONAL", segmentPlaceholder: "Leave blank to search all",
    searching: "Searching businesses…", quotaUsed: "Your monthly allowance of 100 leads has been reached. It will renew automatically at the beginning of next month.", search: "Search this area",
    errorTitle: "The search could not be completed.", loadingSmall: "SEARCHING LOCAL BUSINESSES", loadingTitle: "Finding businesses in the area…", loadingText: "This usually takes a few seconds.",
    ready: "READY TO START", emptyTitle: "Your leads will appear here.", emptyText: "Enter the city and optionally choose a segment. If left blank, the search finds a variety of businesses in the area.",
    features: ["Optional segment", "Regional search", "CSV export"], result: "SEARCH RESULTS", companies: "businesses found", export: "Export CSV",
    importCrm: "Import to CRM", importingCrm: "Importing…", openCrm: "Open CRM", importSuccess: "leads sent to the CRM.", importError: "The leads could not be imported.", history: "Lead history", savedLeads: "saved leads", viewHistory: "View history", historyLoadError: "The lead history could not be loaded.",
    total: "Total", phoneCount: "With phone", whatsappAccess: "WhatsApp access", websiteCount: "With website", noResults: "No businesses with a phone or WhatsApp number were found.", noResultsText: "Check the city, widen the area, or try another segment.",
    address: "Address", phone: "Phone", source: "Source", unavailable: "Not provided", call: "Call", openSite: "Open website", map: "View on map",
    footerSmall: "PRIFE • SMART PROSPECTING", footerTitle: "Public data, faster decisions.", dataSource: "DATA SOURCE", privacy: "Validate business information and follow privacy rules before making contact.", backSite: "Back to site",
    apiFallback: "The search service did not respond correctly. Please try again.", searchError: "The search could not be completed.", timeout: "The search took too long. Please try again in a few seconds.", allSegments: "All segments",
    csv: ["Name", "Segment", "Phone", "WhatsApp", "Website", "Address", "Source", "Source link"],
  },
} satisfies Record<SiteLanguage, Record<string, string | string[]>>;

function localizedApiError(message: string, language: SiteLanguage, fallback: string) {
  if (/franquia|quota|limite (mensal|di[aá]rio)/i.test(message)) {
    if (language === "pt") {
      return "Sua franquia mensal de 100 leads foi atingida. A franquia será renovada automaticamente no início do próximo mês.";
    }
    return language === "es"
      ? "Tu cuota mensual de 100 leads fue alcanzada. La cuota se renovará automáticamente al inicio del próximo mes."
      : "Your monthly allowance of 100 leads has been reached. It will renew automatically at the beginning of next month.";
  }
  if (language === "pt") return message;
  if (/local n[aã]o encontrado|no se encontr[oó] la ubicaci[oó]n|location not found/i.test(message)) {
    return language === "es"
      ? "No se encontró la ubicación. Revisa la ciudad; el barrio y el Estado/Departamento son opcionales."
      : "Location not found. Check the city; neighborhood and State/Department are optional.";
  }
  if (/registrar a franquia|registrar.*pesquisa/i.test(message)) {
    return language === "es" ? "No fue posible registrar la cuota de esta búsqueda." : "The allowance for this search could not be recorded.";
  }
  if (/cidade|localiza[cç][aã]o/i.test(message)) {
    return language === "es" ? "No fue posible localizar la ciudad informada." : "The city provided could not be located.";
  }
  return fallback;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
    </svg>
  );
}

function escapeCsv(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const callingCodes: Record<string, string> = {
  br: "55",
  py: "595",
  ar: "54",
  uy: "598",
  bo: "591",
};

function phoneDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^00/, "");
}

function internationalPhone(value: string, country: string) {
  const digits = phoneDigits(value);
  const code = callingCodes[country] ?? "55";
  if (digits.startsWith(code)) return digits;
  return `${code}${digits.replace(/^0+/, "")}`;
}

function whatsappUrl(value: string, country: string) {
  return `https://wa.me/${internationalPhone(value, country)}`;
}

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [integer = "", ...decimalParts] = cleaned.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  return decimalParts.length > 0
    ? `${normalizedInteger || "0"}.${decimalParts.join("").slice(0, 2)}`
    : normalizedInteger;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function inputNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function LeadFinder({
  userDisplayName,
  signOutUrl,
  initialQuota,
}: {
  userDisplayName: string;
  signOutUrl: string;
  initialQuota: QuotaStatus | null;
}) {
  const language = useSiteLanguage();
  const copy = leadCopy[language];
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [country, setCountry] = useState("br");
  const [averageSaleInput, setAverageSaleInput] = useState("2475");
  const [commissionPercentInput, setCommissionPercentInput] = useState("30");
  const [monthlySalesInput, setMonthlySalesInput] = useState("1");
  const [projectionMonths, setProjectionMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [quota, setQuota] = useState(initialQuota);
  const [importingCrm, setImportingCrm] = useState(false);
  const [crmMessage, setCrmMessage] = useState("");
  const [historyLeads, setHistoryLeads] = useState<Lead[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const locationCopy = locationLabels[language][country] ?? locationLabels[language].br;
  const quotaUnlimited = quota?.monthly_limit === null;
  const unlimitedLabel = language === "pt" ? "Ilimitado" : language === "es" ? "Sin límite" : "Unlimited";
  const quotaExhausted = quota && !quotaUnlimited ? (quota.remaining ?? 0) <= 0 : false;
  const quotaPercent = quota && quota.monthly_limit !== null
    ? Math.min(100, Math.round((quota.used / Math.max(1, quota.monthly_limit)) * 100))
    : 0;
  const simulation = useMemo(() => {
    const averageSale = inputNumber(averageSaleInput);
    const commissionPercent = inputNumber(commissionPercentInput);
    const monthlySales = inputNumber(monthlySalesInput);
    const saleValue = Math.max(0, averageSale);
    const commissionRate = Math.max(0, commissionPercent) / 100;
    const salesCount = Math.max(0, monthlySales);
    const monthlyVolume = saleValue * salesCount;
    const monthlyCommission = monthlyVolume * commissionRate;
    return {
      monthlyVolume,
      monthlyCommission,
      selectedProjection: monthlyCommission * projectionMonths,
    };
  }, [averageSaleInput, commissionPercentInput, monthlySalesInput, projectionMonths]);
  const simulationText = simulatorCopy[language];

  const stats = useMemo(() => {
    const current = leads ?? [];
    return {
      total: current.length,
      withPhone: current.filter((lead) => lead.phone).length,
      withWebsite: current.filter((lead) => lead.website).length,
      whatsappReady: current.filter((lead) => lead.phone).length,
    };
  }, [leads]);

  async function loadHistory(showWhenEmpty = false) {
    if (!quota?.tenant_id) return;
    try {
      const response = await fetch("/api/leads/history", {
        headers: { "x-prife-tenant": quota.tenant_id },
        cache: "no-store",
      });
      const data = await response.json() as HistoryResponse;
      if (!response.ok) throw new Error(data.error || copy.historyLoadError);
      const saved = data.leads || [];
      setHistoryLeads(saved);
      if (showWhenEmpty && saved.length) {
        setLeads((current) => current === null ? saved : current);
        setMeta(null);
        setViewingHistory(true);
      }
    } catch {
      if (showWhenEmpty) setCrmMessage(copy.historyLoadError);
    }
  }

  useEffect(() => {
    const tenantId = quota?.tenant_id;
    if (!tenantId) return;
    let active = true;
    void fetch("/api/leads/history", {
      headers: { "x-prife-tenant": tenantId },
      cache: "no-store",
    }).then(async (response) => {
      const data = await response.json() as HistoryResponse;
      if (!active || !response.ok) return;
      const saved = data.leads || [];
      setHistoryLeads(saved);
      if (saved.length) {
        setLeads((current) => current === null ? saved : current);
        setMeta(null);
        setViewingHistory(true);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [quota?.tenant_id]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          segment,
          city,
          region,
          neighborhood,
          country,
          language,
          provider: "auto",
        }),
      });
      const data = await response.json().catch(() => ({
        error: copy.apiFallback,
      })) as SearchResponse;

      if (data.quota) setQuota(data.quota);
      if (!response.ok) {
        throw new Error(localizedApiError(data.error || "", language, copy.searchError));
      }
      setLeads(data.leads ?? []);
      setMeta(data.meta ?? null);
      setViewingHistory(false);
      void loadHistory(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.name === "AbortError"
            ? copy.timeout
            : requestError.message
          : copy.searchError,
      );
      setLeads(null);
      setMeta(null);
      setViewingHistory(false);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!leads?.length) return;
    const header = copy.csv;
    const rows = leads.map((lead) => [
      lead.name,
      lead.category,
      lead.phone,
      lead.phone ? whatsappUrl(lead.phone, country) : "",
      lead.website,
      lead.address,
      lead.provider,
      lead.sourceUrl,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-prife-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importToCrm() {
    if (!leads?.length || !quota?.tenant_id) return;
    setImportingCrm(true);
    setCrmMessage("");
    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-prife-tenant": quota.tenant_id },
        body: JSON.stringify({ leads }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || copy.importError);
      setCrmMessage(`${data.imported} ${copy.importSuccess}`);
      window.location.assign(`/crm?imported=${encodeURIComponent(String(data.imported))}`);
    } catch (requestError) {
      setCrmMessage(requestError instanceof Error ? requestError.message : copy.importError);
    } finally {
      setImportingCrm(false);
    }
  }

  return (
    <main className={styles.page} id="conteudo">
      <div className={styles.backdrop} aria-hidden="true" />
      <header className={styles.header}>
        {/* Navegação nativa intencional: reinicia a página institucional sem estado residual. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.brand} href="/" aria-label={copy.back}>
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" />
        </a>
        <div className={styles.account}>
          <span>{copy.area}</span>
          <strong>{userDisplayName}</strong>
          <a href={signOutUrl}>{copy.signOut}</a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroSignals} aria-hidden="true">
          <span className={styles.signalRadar}><i /><i /><i /></span>
          <span className={`${styles.signalNode} ${styles.signalNodeOne}`}><i /></span>
          <span className={`${styles.signalNode} ${styles.signalNodeTwo}`}><i /></span>
          <span className={`${styles.signalNode} ${styles.signalNodeThree}`}><i /></span>
          <span className={`${styles.signalNode} ${styles.signalNodeFour}`}><i /></span>
          <span className={`${styles.signalBlip} ${styles.signalBlipOne}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipTwo}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipThree}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipFour}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipFive}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipSix}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipSeven}`} />
          <span className={`${styles.signalBlip} ${styles.signalBlipEight}`} />
          <span className={styles.signalRoute} />
        </div>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>
            {copy.titleBefore} <em>{copy.titleHighlight}</em>
          </h1>
          <p>{copy.description}</p>
        </div>
        <div className={styles.earningsSimulator}>
          <div className={styles.simulatorHeading}>
            <small className={styles.simulatorSpotlight}><span aria-hidden="true">✦</span>{simulationText.eyebrow}</small>
            <h2>{simulationText.title}</h2>
            <span><strong>{simulationText.currencyNote}</strong></span>
          </div>
          <div className={styles.simulatorInputs}>
            <label>
              <span>{simulationText.averageSale}</span>
              <span className={styles.simulatorInput}><b>R$</b><input type="text" inputMode="decimal" value={averageSaleInput} onChange={(event) => setAverageSaleInput(sanitizeDecimalInput(event.target.value))} /></span>
            </label>
            <label>
              <span>{simulationText.commission}</span>
              <span className={styles.simulatorInput}><input type="text" inputMode="decimal" value={commissionPercentInput} onChange={(event) => setCommissionPercentInput(sanitizeDecimalInput(event.target.value))} /><b>%</b></span>
            </label>
            <label>
              <span>{simulationText.salesPerMonth}</span>
              <span className={styles.simulatorInput}><input type="text" inputMode="numeric" value={monthlySalesInput} onChange={(event) => setMonthlySalesInput(sanitizeIntegerInput(event.target.value))} /></span>
            </label>
            <label>
              <span>{simulationText.projectionMonths}</span>
              <select className={styles.simulatorMonthSelect} value={projectionMonths} onChange={(event) => setProjectionMonths(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.simulatorMainResult}>
            <span>{simulationText.monthlyCommission}</span>
            <strong>{brlFormatter.format(simulation.monthlyCommission)}</strong>
            <small>{simulationText.monthlyVolume}: {brlFormatter.format(simulation.monthlyVolume)}</small>
          </div>
          <div className={styles.simulatorProjections}>
            <div><span>{simulationText.projection} · {projectionMonths} {projectionMonths === 1 ? simulationText.month : simulationText.months}</span><strong>{brlFormatter.format(simulation.selectedProjection)}</strong></div>
          </div>
          <p className={styles.simulatorDisclaimer}>{simulationText.disclaimer}</p>
        </div>
      </section>

      <section className={styles.workspace}>
        <form className={styles.searchPanel} onSubmit={handleSearch}>
          <div className={styles.panelHeading}>
            <span className={styles.searchOrb}><SearchIcon /></span>
            <div>
              <small>{copy.newSearch}</small>
              <h2>{copy.define}</h2>
            </div>
          </div>

          {quota && (
            <div className={styles.quotaCard} aria-label={copy.monthly}>
              <div>
                <span>{copy.monthly}</span>
                <strong>{quotaUnlimited ? `${quota.used} ${copy.used}` : `${quota.used} de ${quota.monthly_limit} ${copy.used}`}</strong>
              </div>
              <b>{quotaUnlimited ? unlimitedLabel : `${quota.remaining ?? 0} ${copy.available}`}</b>
              <span className={styles.quotaTrack} aria-hidden="true" hidden={quotaUnlimited}>
                <i style={{ width: `${quotaPercent}%` }} />
              </span>
            </div>
          )}

          <div className={styles.fieldGrid}>
            <label>
              <span>{copy.country} <small>{copy.required}</small></span>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setRegion("");
                  setNeighborhood("");
                }}
              >
                {countries.map((value) => (
                  <option key={value} value={value}>{countryLabels[language][value]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{locationCopy.region}</span>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder={locationCopy.regionPlaceholder}
                maxLength={70}
                autoComplete="address-level1"
              />
            </label>
          </div>

          <div className={styles.locationGrid}>
            <label className={styles.cityField}>
              <span>{copy.city} <small>{copy.required}</small></span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder={locationCopy.cityPlaceholder}
                minLength={2}
                maxLength={70}
                required
                autoComplete="address-level2"
              />
            </label>
            <label>
              <span>{locationCopy.neighborhood}</span>
              <input
                value={neighborhood}
                onChange={(event) => setNeighborhood(event.target.value)}
                placeholder={locationCopy.neighborhoodPlaceholder}
                maxLength={70}
                autoComplete="address-level3"
              />
            </label>
          </div>

          <label className={styles.segmentField}>
            <span>{copy.segment} <small>{copy.optional}</small></span>
            <input
              value={segment}
              onChange={(event) => setSegment(event.target.value)}
              placeholder={copy.segmentPlaceholder}
              list="segmentos-sugeridos"
              maxLength={60}
            />
            <datalist id="segmentos-sugeridos">
              {segmentSuggestions[language].map((suggestion) => <option key={suggestion} value={suggestion} />)}
            </datalist>
          </label>

          <button className={styles.searchButton} type="submit" disabled={loading || quotaExhausted}>
            {loading ? <span className={styles.spinner} /> : <SearchIcon />}
            {loading
              ? copy.searching
              : quotaExhausted
                ? copy.quotaUsed
                : copy.search}
            {!loading && <ArrowIcon />}
          </button>
        </form>

        <div className={styles.resultsPanel} aria-live="polite">
          {error && (
            <div className={styles.error} role="alert">
              <strong>{copy.errorTitle}</strong>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className={styles.loadingState}>
              <span className={styles.radar}><i /><i /><i /></span>
              <small>{copy.loadingSmall}</small>
              <h2>{copy.loadingTitle}</h2>
              <p>{copy.loadingText}</p>
            </div>
          )}

          {!loading && leads === null && !error && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><SearchIcon /></span>
              <small>{copy.ready}</small>
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyText}</p>
              <div className={styles.emptyFeatures}>
                {copy.features.map((feature) => <span key={feature}>{feature}</span>)}
              </div>
            </div>
          )}

          {!loading && leads !== null && (
            <>
              <div className={styles.resultsHeader}>
                <div>
                  <small>{viewingHistory ? copy.history : copy.result}</small>
                  <h2>{stats.total} {viewingHistory ? copy.savedLeads : copy.companies}</h2>
                  {meta && <p>{meta.category} · {meta.location}</p>}
                </div>
                <div className={styles.resultActions}>
                  {historyLeads.length > 0 && !viewingHistory && (
                    <button type="button" onClick={() => { setLeads(historyLeads); setMeta(null); setViewingHistory(true); }}>
                      {copy.viewHistory} ({historyLeads.length})
                    </button>
                  )}
                  <button type="button" onClick={importToCrm} disabled={!leads.length || importingCrm}>
                    <span aria-hidden="true">＋</span> {importingCrm ? copy.importingCrm : copy.importCrm}
                  </button>
                  <a href="/crm">{copy.openCrm}</a>
                  <button type="button" onClick={exportCsv} disabled={!leads.length}>
                    <ExportIcon /> {copy.export}
                  </button>
                </div>
              </div>
              {crmMessage && <p className={styles.crmMessage} role="status">{crmMessage}</p>}

              <div className={styles.stats}>
                <article><strong>{stats.total}</strong><span>{copy.total}</span></article>
                <article><strong>{stats.withPhone}</strong><span>{copy.phoneCount}</span></article>
                <article><strong>{stats.whatsappReady}</strong><span>{copy.whatsappAccess}</span></article>
                <article><strong>{stats.withWebsite}</strong><span>{copy.websiteCount}</span></article>
              </div>

              {leads.length === 0 ? (
                <div className={styles.noResults}>
                  <h3>{copy.noResults}</h3>
                  <p>{copy.noResultsText}</p>
                </div>
              ) : (
                <div className={styles.leadList}>
                  {leads.map((lead, index) => (
                    <article className={styles.leadCard} key={lead.sourceId}>
                      <div className={styles.leadNumber}>{String(index + 1).padStart(2, "0")}</div>
                      <div className={styles.leadMain}>
                        <div className={styles.leadTitle}>
                          <div>
                            <span>{lead.category}{typeof lead.distanceKm === "number" ? ` · ${lead.distanceKm < 1 ? `${Math.round(lead.distanceKm * 1000)} m` : `${lead.distanceKm.toFixed(1)} km`}` : ""}</span>
                            <h3>{lead.name}</h3>
                          </div>
                        </div>
                        <dl className={styles.details}>
                          <div><dt>{copy.address}</dt><dd>{lead.address || copy.unavailable}</dd></div>
                          <div><dt>{copy.phone}</dt><dd>{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a> : copy.unavailable}</dd></div>
                        </dl>
                        <div className={styles.leadActions}>
                          {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{copy.call}</a>}
                          {lead.phone && <a className={styles.whatsappAction} href={whatsappUrl(lead.phone, lead.country || country)} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowIcon /></a>}
                          {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer">{copy.openSite} <ArrowIcon /></a>}
                          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.map}</a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

    </main>
  );
}
