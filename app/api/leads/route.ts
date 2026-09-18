import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../lib/supabase/access";

export const dynamic = "force-dynamic";

type CategoryDefinition = {
  label: string;
  filters: string[];
  searchText?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type NominatimBusinessResult = NominatimResult & {
  place_id?: number;
  osm_id?: number;
  osm_type?: string;
  name?: string;
  category?: string;
  type?: string;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
};

type MicrosoftMapResult = {
  id?: string;
  type?: string;
  poi?: {
    name?: string;
    phone?: string;
    url?: string;
    categories?: string[];
  };
  address?: { freeformAddress?: string };
  position?: { lat?: number; lon?: number };
};

type QuotaStatus = {
  tenant_id: string;
  daily_limit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  usage_date: string;
};

type LeadResult = {
  sourceId: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  sourceUrl: string;
  provider: string;
  distanceKm: number | null;
  latitude?: number | null;
  longitude?: number | null;
  score?: number;
};

type SearchResult = {
  leads: LeadResult[];
  meta: {
    category: string;
    location: string;
    radius: number;
    returned: number;
    attribution: string;
    provider: string;
  };
};

type ProviderId = "auto" | "crust" | "microsoft" | "google";

const categories: Record<string, CategoryDefinition> = {
  barbers: {
    label: "Barbearias",
    searchText: "barbearias",
    filters: ['["shop"="hairdresser"]["hairdresser"="barber"]', '["shop"="barber"]'],
  },
  restaurants: {
    label: "Restaurantes",
    filters: ['["amenity"="restaurant"]'],
  },
  cafes: {
    label: "Cafeterias",
    filters: ['["amenity"="cafe"]'],
  },
  bakeries: {
    label: "Padarias e confeitarias",
    filters: ['["shop"="bakery"]', '["shop"="pastry"]'],
  },
  wellness: {
    label: "Lojas de produtos naturais",
    filters: ['["shop"="health_food"]', '["shop"="nutrition_supplements"]'],
  },
  gyms: {
    label: "Academias e centros fitness",
    filters: ['["leisure"="fitness_centre"]'],
  },
  clinics: {
    label: "Clínicas e centros de saúde",
    filters: ['["amenity"="clinic"]', '["healthcare"="clinic"]'],
  },
  physiotherapy: {
    label: "Fisioterapia",
    filters: ['["healthcare"="physiotherapist"]'],
  },
  dentistry: {
    label: "Clínicas odontológicas",
    filters: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  },
  nutrition: {
    label: "Nutricionistas",
    filters: ['["healthcare"="dietitian"]', '["healthcare"="nutritionist"]'],
  },
  beauty: {
    label: "Estética, spas e salões",
    filters: ['["shop"="beauty"]', '["shop"="hairdresser"]', '["leisure"="spa"]'],
  },
  pharmacies: {
    label: "Farmácias",
    filters: ['["amenity"="pharmacy"]'],
  },
  hotels: {
    label: "Hotéis e pousadas",
    filters: ['["tourism"="hotel"]', '["tourism"="guest_house"]'],
  },
  pets: {
    label: "Pet shops e veterinárias",
    filters: ['["shop"="pet"]', '["amenity"="veterinary"]'],
  },
  mechanics: {
    label: "Oficinas e centros automotivos",
    filters: ['["shop"="car_repair"]', '["shop"="tyres"]'],
  },
  realestate: {
    label: "Imobiliárias",
    filters: ['["office"="estate_agent"]'],
  },
  accounting: {
    label: "Contabilidade",
    filters: ['["office"="accountant"]'],
  },
  lawyers: {
    label: "Advocacia",
    filters: ['["office"="lawyer"]'],
  },
  construction: {
    label: "Construção e reformas",
    filters: ['["office"="construction_company"]', '["craft"="builder"]'],
  },
  schools: {
    label: "Escolas e cursos",
    filters: ['["amenity"="school"]', '["amenity"="language_school"]', '["office"="educational_institution"]'],
  },
  yoga: {
    label: "Yoga e práticas integrativas",
    filters: ['["sport"="yoga"]', '["healthcare"="alternative"]'],
  },
  laboratories: {
    label: "Laboratórios",
    filters: ['["healthcare"="laboratory"]'],
  },
  doctors: {
    label: "Médicos e consultórios",
    searchText: "médicos e consultórios",
    filters: ['["amenity"="doctors"]', '["healthcare"="doctor"]'],
  },
};

const allowedCountries = new Set(["br", "py", "ar", "uy", "bo"]);
const countryNames: Record<string, string> = {
  br: "Brasil",
  py: "Paraguai",
  ar: "Argentina",
  uy: "Uruguai",
  bo: "Bolívia",
};
const callingCodes: Record<string, string> = { br: "55", py: "595", ar: "54", uy: "598", bo: "591" };
const geocodeCache = new Map<string, { expiresAt: number; value: NominatimResult }>();
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
let geocodeChain: Promise<void> = Promise.resolve();
let nextGeocodeAt = 0;

function jsonError(message: string, status: number, quota?: QuotaStatus) {
  return NextResponse.json(
    { error: message, ...(quota ? { quota } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseQuota(value: unknown): QuotaStatus | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as Record<string, unknown>;
  const number = (key: keyof QuotaStatus) => Number(row[key]);
  const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : "";
  const usageDate = typeof row.usage_date === "string" ? row.usage_date : "";
  const dailyLimit = number("daily_limit");
  const used = number("used");
  const unlimited = row.unlimited === true;
  const remaining = row.remaining == null ? null : number("remaining");

  if (
    !tenantId ||
    !usageDate ||
    !Number.isFinite(dailyLimit) ||
    !Number.isFinite(used) ||
    (!unlimited && (remaining === null || !Number.isFinite(remaining)))
  ) {
    return null;
  }

  return {
    tenant_id: tenantId,
    daily_limit: dailyLimit,
    used,
    remaining,
    unlimited,
    usage_date: usageDate,
  };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function crmRowsFromLeads(
  leads: Array<Record<string, unknown>>,
  country: string,
  tenantId: string,
  userId: string,
) {
  const callingCode = callingCodes[country] || callingCodes.br;
  const byPhone = new Map<string, Record<string, unknown>>();
  for (const lead of leads) {
    const rawPhone = String(lead.phone || lead.whatsapp || "").replace(/\D/g, "").replace(/^00/, "");
    const phone = rawPhone.startsWith(callingCode)
      ? rawPhone.slice(0, 18)
      : `${callingCode}${rawPhone.replace(/^0+/, "")}`.slice(0, 18);
    const name = String(lead.name || lead.company_name || "").trim().slice(0, 180);
    if (phone.length < 7 || !name) continue;
    byPhone.set(phone, {
      tenant_id: tenantId,
      created_by: userId,
      source_id: String(lead.sourceId || lead.provider_lead_id || lead.id || "").slice(0, 240) || null,
      company_name: name,
      segment: String(lead.category || "").slice(0, 160) || null,
      phone,
      whatsapp: phone,
      email: String(lead.email || "").trim().slice(0, 180) || null,
      address: String(lead.address || "").trim().slice(0, 500) || null,
      website: String(lead.website || "").trim().slice(0, 500) || null,
      source: String(lead.provider || "Prospector").slice(0, 120),
      source_url: String(lead.sourceUrl || lead.source_url || "").trim().slice(0, 500) || null,
      metadata: { country, imported_automatically: true },
      updated_at: new Date().toISOString(),
    });
  }
  return [...byPhone.values()];
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCategory(segment: string) {
  const normalized = normalizedText(segment);
  const aliases: Array<[RegExp, keyof typeof categories]> = [
    [/\b(medico|medicos|medica|medicas|doutor|doutores|consultorio|consultorios|doctor|doctors|medical office|medical offices)\b/, "doctors"],
    [/\b(clinica|clinicas|centro de saude|centro de salud|centros de salud|clinic|clinics|health center|health centers)\b/, "clinics"],
    [/\b(barbearia|barbearias|barbeiro|barbeiros|barberia|barberias|barbershop|barbershops)\b/, "barbers"],
    [/\b(restaurante|restaurantes)\b/, "restaurants"],
    [/\b(cafe|cafes|cafeteria|cafeterias|coffee shop|coffee shops)\b/, "cafes"],
    [/\b(padaria|padarias|confeitaria|confeitarias|panaderia|panaderias|bakery|bakeries|pastry shop)\b/, "bakeries"],
    [/\b(academia|academias|gimnasio|gimnasios|gym|gyms|fitness)\b/, "gyms"],
    [/\b(fisioterapia|fisioterapeuta|fisioterapeutas|physiotherapy|physiotherapist)\b/, "physiotherapy"],
    [/\b(dentista|dentistas|odontologia|odontologica|odontologicas|dental|dentistry)\b/, "dentistry"],
    [/\b(nutricionista|nutricionistas|nutricao|nutritionist|nutritionists|nutrition)\b/, "nutrition"],
    [/\b(estetica|salao|saloes|salon|salons|beauty|spa|spas)\b/, "beauty"],
    [/\b(farmacia|farmacias|pharmacy|pharmacies)\b/, "pharmacies"],
    [/\b(hotel|hoteis|hotels|pousada|pousadas|posada|posadas|guest house)\b/, "hotels"],
    [/\b(pet shop|pet shops|veterinaria|veterinarias|veterinario|veterinarios|veterinarian|veterinarians)\b/, "pets"],
    [/\b(oficina|oficinas|mecanico|mecanicos|taller|talleres|mechanic|mechanics|auto repair)\b/, "mechanics"],
    [/\b(imobiliaria|imobiliarias|inmobiliaria|inmobiliarias|real estate)\b/, "realestate"],
    [/\b(contabilidade|contador|contadores|contabilidad|accounting|accountant)\b/, "accounting"],
    [/\b(advocacia|advogado|advogados|abogado|abogados|lawyer|lawyers|law firm)\b/, "lawyers"],
  ];
  const match = aliases.find(([pattern]) => pattern.test(normalized));
  return match ? categories[match[1]] : null;
}

type ApiLanguage = "pt" | "es" | "en";

const categoryTranslations: Record<ApiLanguage, Partial<Record<keyof typeof categories, string>>> = {
  pt: {},
  es: {
    barbers: "Barberías", restaurants: "Restaurantes", cafes: "Cafeterías", bakeries: "Panaderías y confiterías", wellness: "Tiendas de productos naturales", gyms: "Gimnasios y centros fitness", clinics: "Clínicas y centros de salud", physiotherapy: "Fisioterapia", dentistry: "Clínicas odontológicas", nutrition: "Nutricionistas", beauty: "Estética, spas y salones", pharmacies: "Farmacias", hotels: "Hoteles y posadas", pets: "Tiendas de mascotas y veterinarias", mechanics: "Talleres y centros automotrices", realestate: "Inmobiliarias", accounting: "Contabilidad", lawyers: "Abogados", construction: "Construcción y reformas", schools: "Escuelas y cursos", yoga: "Yoga y prácticas integrativas", laboratories: "Laboratorios", doctors: "Médicos y consultorios",
  },
  en: {
    barbers: "Barbershops", restaurants: "Restaurants", cafes: "Coffee shops", bakeries: "Bakeries and pastry shops", wellness: "Health food stores", gyms: "Gyms and fitness centers", clinics: "Clinics and health centers", physiotherapy: "Physiotherapy", dentistry: "Dental clinics", nutrition: "Nutritionists", beauty: "Beauty salons and spas", pharmacies: "Pharmacies", hotels: "Hotels and guest houses", pets: "Pet shops and veterinarians", mechanics: "Auto repair shops", realestate: "Real estate agencies", accounting: "Accounting", lawyers: "Law firms", construction: "Construction and renovation", schools: "Schools and courses", yoga: "Yoga and integrative practices", laboratories: "Laboratories", doctors: "Doctors and medical offices",
  },
};

function localizedCategoryLabel(category: CategoryDefinition, language: ApiLanguage) {
  const entry = Object.entries(categories).find(([, value]) => value === category);
  if (!entry) return category.label;
  return categoryTranslations[language][entry[0] as keyof typeof categories] ?? category.label;
}

function escapeOverpassRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/["\n\r]/g, " ");
}

function enforceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function withinRateLimit(key: string) {
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }

  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function scheduleGeocode<T>(task: () => Promise<T>) {
  let releaseQueue = () => {};
  const previous = geocodeChain;
  geocodeChain = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previous;
  try {
    const waitMs = Math.max(0, nextGeocodeAt - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    nextGeocodeAt = Date.now() + 1_100;
    return await task();
  } finally {
    releaseQueue();
  }
}

async function geocodeLocation(searchLocation: string, country: string) {
  const cacheKey = `${country}:${searchLocation.toLocaleLowerCase("pt-BR")}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", country);
  url.searchParams.set("q", searchLocation);

  const response = await scheduleGeocode(() =>
    fetchWithTimeout(
      url.toString(),
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": "Prife-Brasil-Prospector/1.0 (+https://prife-brasil.com)",
        },
        cache: "no-store",
      },
      4_500,
    ),
  );

  if (!response.ok) throw new Error(`GEOCODE_${response.status}`);
  const results = (await response.json()) as NominatimResult[];
  const result = results[0];
  if (!result) return null;

  geocodeCache.set(cacheKey, {
    expiresAt: Date.now() + 24 * 60 * 60_000,
    value: result,
  });
  return result;
}

async function geocodeBestLocation({
  neighborhood,
  city,
  region,
  country,
}: {
  neighborhood: string;
  city: string;
  region: string;
  country: string;
}) {
  const countryName = countryNames[country];
  const candidates = [
    [neighborhood, city, region, countryName],
    [city, region, countryName],
    [city, countryName],
    [city],
  ]
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter((value, index, values) => value && values.indexOf(value) === index);

  for (const candidate of candidates) {
    const location = await geocodeLocation(candidate, country);
    if (location) return { location, matchedQuery: candidate };
  }

  console.warn("Prospector geocoding returned no location", {
    country,
    candidates,
  });
  return null;
}

function buildOverpassQuery(
  category: CategoryDefinition,
  latitude: number,
  longitude: number,
  radius: number,
) {
  const searches = category.filters
    .map(
      (filter) =>
        `nwr${filter}(around:${radius},${latitude.toFixed(6)},${longitude.toFixed(6)});`,
    )
    .join("\n");

  return `[out:json][timeout:10];\n(\n${searches}\n);\nout center tags qt 80;`;
}

function buildCustomOverpassQuery(
  niche: string,
  latitude: number,
  longitude: number,
  radius: number,
) {
  const safeNiche = escapeOverpassRegex(niche);
  return `[out:json][timeout:10];\n(\nnwr["name"~"${safeNiche}",i](around:${radius},${latitude.toFixed(6)},${longitude.toFixed(6)});\nnwr["brand"~"${safeNiche}",i](around:${radius},${latitude.toFixed(6)},${longitude.toFixed(6)});\n);\nout center tags qt 80;`;
}

function buildAllBusinessesOverpassQuery(
  latitude: number,
  longitude: number,
  radius: number,
) {
  const area = `(around:${radius},${latitude.toFixed(6)},${longitude.toFixed(6)})`;
  return `[out:json][timeout:10];\n(\nnwr["name"]["shop"]${area};\nnwr["name"]["office"]${area};\nnwr["name"]["craft"]${area};\nnwr["name"]["amenity"~"restaurant|cafe|fast_food|clinic|doctors|dentist|pharmacy|hospital|school|college|bank|fuel|veterinary|marketplace"]${area};\nnwr["name"]["tourism"~"hotel|guest_house|motel|hostel"]${area};\nnwr["name"]["leisure"~"fitness_centre|sports_centre|spa"]${area};\n);\nout center tags qt 100;`;
}

async function fetchOverpass(query: string) {
  const endpoints = [
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
  ];

  return Promise.any(endpoints.map(async (endpoint) => {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Prife-Brasil-Prospector/1.0 (+https://prife-brasil.com)",
        },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
      },
      6_500,
    );
    if (!response.ok) throw new Error(`OVERPASS_${response.status}`);
    return response;
  }));
}

function firstTag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

function publicContactPhone(tags: Record<string, string>) {
  const value = firstTag(tags, [
    "contact:whatsapp",
    "whatsapp",
    "contact:mobile",
    "mobile",
    "contact:phone",
    "phone",
  ]);
  if (!value) return null;
  return value.replace(/\D/g, "").length >= 7 ? value : null;
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value)) return `https://${value}`;
  return null;
}

function formatAddress(tags: Record<string, string>) {
  const street = firstTag(tags, ["addr:street", "addr:place"]);
  const number = tags["addr:housenumber"]?.trim();
  const locality = firstTag(tags, ["addr:suburb", "addr:neighbourhood"]);
  const city = firstTag(tags, ["addr:city", "addr:town", "addr:village"]);
  const state = tags["addr:state"]?.trim();

  return [
    [street, number].filter(Boolean).join(", "),
    locality,
    city,
    state,
  ]
    .filter(Boolean)
    .join(" · ") || null;
}

function scoreLead(tags: Record<string, string>) {
  const phone = publicContactPhone(tags);
  const website = firstTag(tags, ["contact:website", "website"]);
  const email = firstTag(tags, ["contact:email", "email"]);
  const social = firstTag(tags, ["contact:instagram", "instagram", "contact:facebook", "facebook"]);
  const address = formatAddress(tags);
  const openingHours = tags.opening_hours?.trim();

  let score = 35;
  if (phone) score += 22;
  if (website) score += 16;
  if (email) score += 12;
  if (address) score += 8;
  if (social) score += 4;
  if (openingHours) score += 3;

  const reasons = [
    phone ? "telefone público" : null,
    website ? "site informado" : null,
    email ? "e-mail comercial" : null,
    address ? "endereço completo" : null,
  ].filter(Boolean);

  return {
    score: Math.min(score, 100),
    reason:
      reasons.length > 0
        ? `Bom potencial: ${reasons.join(", ")}.`
        : "Cadastro básico; recomenda-se validar os dados antes do contato.",
  };
}

function distanceInKm(
  originLatitude: number,
  originLongitude: number,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(latitude - originLatitude);
  const longitudeDelta = radians(longitude - originLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(originLatitude)) * Math.cos(radians(latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function identityKey(name: string, phone: string | null, address: string | null) {
  const normalize = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");
  const phoneKey = phone?.replace(/\D/g, "");
  return phoneKey?.length && phoneKey.length >= 7
    ? `phone:${phoneKey}`
    : `business:${normalize(name)}:${normalize(address ?? "")}`;
}

async function searchGooglePlaces({
  niche,
  searchLocation,
  country,
  limit,
  language,
}: {
  niche: string;
  searchLocation: string;
  country: string;
  limit: number;
  language: ApiLanguage;
}): Promise<SearchResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetchWithTimeout(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.internationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.businessStatus",
          "places.location",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: `${niche} ${{ pt: "em", es: "en", en: "in" }[language]} ${searchLocation}`,
        languageCode: language === "pt" ? "pt-BR" : language,
        regionCode: country.toUpperCase(),
        pageSize: Math.min(limit, 20),
      }),
      cache: "no-store",
    },
    15_000,
  );

  if (!response.ok) throw new Error(`GOOGLE_PLACES_${response.status}`);
  const data = (await response.json()) as { places?: GooglePlace[] };
  const seen = new Set<string>();
  const leads = (data.places ?? [])
    .filter((place) => place.businessStatus !== "CLOSED_PERMANENTLY")
    .flatMap((place) => {
      const name = place.displayName?.text?.trim();
      const rawPhone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null;
      const phone = rawPhone && rawPhone.replace(/\D/g, "").length >= 7 ? rawPhone : null;
      if (!name || !phone) return [];
      const address = place.formattedAddress ?? null;
      const key = identityKey(name, phone, address);
      if (seen.has(key)) return [];
      seen.add(key);

      return [{
        sourceId: `google:${place.id}`,
        name,
        category: niche,
        address,
        phone,
        website: normalizeWebsite(place.websiteUri ?? null),
        sourceUrl: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
        provider: "Google Places",
        distanceKm: null,
      }];
    })
    .slice(0, limit);

  return {
    leads,
    meta: {
      category: niche,
      location: searchLocation,
      radius: 0,
      returned: leads.length,
      attribution: "Google Maps",
      provider: "Google Places",
    },
  };
}

async function searchMicrosoftMaps({
  niche,
  searchLocation,
  country,
  limit,
  language,
}: {
  niche: string;
  searchLocation: string;
  country: string;
  limit: number;
  language: ApiLanguage;
}): Promise<SearchResult> {
  const apiKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY?.trim();
  if (!apiKey) throw new Error("MICROSOFT_MAPS_NOT_CONFIGURED");

  const url = new URL("https://atlas.microsoft.com/search/fuzzy/json");
  url.searchParams.set("api-version", "1.0");
  url.searchParams.set("subscription-key", apiKey);
  url.searchParams.set("query", `${niche} em ${searchLocation}`);
  url.searchParams.set("countrySet", country.toUpperCase());
  url.searchParams.set("language", language === "pt" ? "pt-BR" : language);
  url.searchParams.set("limit", String(Math.min(limit, 20)));
  url.searchParams.set("idxSet", "POI");
  url.searchParams.set("typeahead", "false");

  const response = await fetchWithTimeout(
    url.toString(),
    { headers: { Accept: "application/json" }, cache: "no-store" },
    15_000,
  );
  if (!response.ok) throw new Error(`MICROSOFT_MAPS_${response.status}`);

  const payload = await response.json() as { results?: MicrosoftMapResult[] };
  const seen = new Set<string>();
  const leads = (payload.results ?? []).flatMap((item) => {
    const name = item.poi?.name?.trim();
    const rawPhone = item.poi?.phone?.trim() || null;
    const phone = rawPhone && rawPhone.replace(/\D/g, "").length >= 7 ? rawPhone : null;
    const website = normalizeWebsite(item.poi?.url ?? null);
    const address = item.address?.freeformAddress?.trim() || null;
    if (!name || (!phone && !website)) return [];
    const key = identityKey(name, phone, address);
    if (seen.has(key)) return [];
    seen.add(key);
    const latitude = Number(item.position?.lat);
    const longitude = Number(item.position?.lon);
    const sourceUrl = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `https://www.bing.com/maps?cp=${latitude}~${longitude}&lvl=16&sp=point.${latitude}_${longitude}_${encodeURIComponent(name)}`
      : `https://www.bing.com/maps?q=${encodeURIComponent(`${name} ${address || searchLocation}`)}`;
    return [{
      sourceId: `microsoft:${item.id || key}`,
      name,
      category: item.poi?.categories?.[0] || niche,
      address,
      phone,
      website,
      sourceUrl,
      provider: "Microsoft Maps",
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      distanceKm: null,
    }];
  }).slice(0, limit);

  return {
    leads,
    meta: {
      category: niche,
      location: searchLocation,
      radius: 0,
      returned: leads.length,
      attribution: "Microsoft Azure Maps / Bing",
      provider: "Microsoft Maps",
    },
  };
}

export async function GET() {
  const user = await getAuthenticatedContext();
  if (!user) return jsonError("Faça login para usar o prospector.", 401);
  return NextResponse.json({
    providers: [
      { id: "auto", label: "Automático", available: true, description: "Alterna entre Google Maps e Bing a cada pesquisa" },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}

async function searchNominatimBusinesses({
  niche,
  searchLocation,
  country,
  limit,
  language,
  latitude,
  longitude,
}: {
  niche: string;
  searchLocation: string;
  country: string;
  limit: number;
  language: ApiLanguage;
  latitude: number;
  longitude: number;
}): Promise<SearchResult> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("limit", String(Math.min(limit, 20)));
  url.searchParams.set("countrycodes", country);
  url.searchParams.set("q", `${niche} in ${searchLocation}`);

  const response = await scheduleGeocode(() =>
    fetchWithTimeout(
      url.toString(),
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": language === "pt" ? "pt-BR,pt;q=0.9" : language,
          "User-Agent": "Prife-Brasil-Prospector/1.1 (+https://prife-brasil.com)",
        },
        cache: "no-store",
      },
      5_500,
    ),
  );

  if (!response.ok) throw new Error(`NOMINATIM_BUSINESS_${response.status}`);
  const data = (await response.json()) as NominatimBusinessResult[];
  const seen = new Set<string>();
  const leads = data.flatMap((result) => {
    const tags = result.extratags ?? {};
    const name = (
      result.name
      || result.namedetails?.name
      || result.display_name.split(",")[0]
      || ""
    ).trim();
    if (!name) return [];

    const phone = publicContactPhone(tags);
    if (!phone) return [];
    const website = normalizeWebsite(firstTag(tags, ["contact:website", "website"]));
    const address = result.display_name?.trim() || null;
    const key = identityKey(name, phone, address);
    if (seen.has(key)) return [];
    seen.add(key);

    const resultLatitude = Number(result.lat);
    const resultLongitude = Number(result.lon);
    const osmType = result.osm_type?.toLocaleLowerCase("en-US");
    const normalizedOsmType = osmType === "n" ? "node"
      : osmType === "w" ? "way"
        : osmType === "r" ? "relation"
          : osmType;
    const sourceUrl = normalizedOsmType && result.osm_id
      ? `https://www.openstreetmap.org/${normalizedOsmType}/${result.osm_id}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(name)}`;

    return [{
      sourceId: `nominatim:${result.place_id ?? `${result.osm_type}:${result.osm_id}`}`,
      name,
      category: niche,
      address,
      phone,
      website,
      sourceUrl,
      provider: "OpenStreetMap",
      latitude: Number.isFinite(resultLatitude) ? resultLatitude : null,
      longitude: Number.isFinite(resultLongitude) ? resultLongitude : null,
      distanceKm: distanceInKm(latitude, longitude, resultLatitude, resultLongitude),
    }];
  }).slice(0, limit);

  return {
    leads,
    meta: {
      category: niche,
      location: searchLocation,
      radius: 0,
      returned: leads.length,
      attribution: "© OpenStreetMap contributors — ODbL",
      provider: "OpenStreetMap",
    },
  };
}

export async function POST(request: Request) {
  const user = await getAuthenticatedContext();
  if (!user) return jsonError("Faça login para usar o prospector.", 401);

  if (!user.isAdmin) {
    if (user.profile?.approval_status !== "approved" || !user.profile.tenant_id) {
      return jsonError("Seu acesso ainda aguarda aprovação administrativa.", 403);
    }

    const [{ data: tenant }, { data: features }] = await Promise.all([
      user.supabase
        .from("tenants")
        .select("status,site_enabled,billing_due_at,billing_exempt")
        .eq("id", user.profile.tenant_id)
        .maybeSingle<{ status: string; site_enabled: boolean; billing_due_at: string; billing_exempt: boolean }>(),
      user.supabase
        .from("tenant_features")
        .select("prospector_enabled")
        .eq("tenant_id", user.profile.tenant_id)
        .maybeSingle<{ prospector_enabled: boolean }>(),
    ]);

    const billingExpired = Boolean(
      tenant && !tenant.billing_exempt && new Date(tenant.billing_due_at).getTime() < Date.now(),
    );
    if (!tenant || tenant.status !== "active" || !tenant.site_enabled || billingExpired) {
      return jsonError("Este espaço está temporariamente bloqueado. Regularize a mensalidade para continuar.", 403);
    }

    if (!features?.prospector_enabled) {
      return jsonError("O Prospector não está ativo para este espaço.", 403);
    }
  }

  if (!enforceSameOrigin(request)) {
    return jsonError("Origem da solicitação não permitida.", 403);
  }

  if (!withinRateLimit(user.email.toLocaleLowerCase("en-US"))) {
    return jsonError("Limite temporário atingido. Tente novamente em alguns minutos.", 429);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Dados da pesquisa inválidos.", 400);
  }

  const city = cleanText(body.city, 90);
  const region = cleanText(body.region, 70);
  const neighborhood = cleanText(body.neighborhood, 70);
  const segment = cleanText(body.segment, 60);
  const country = cleanText(body.country, 2).toLocaleLowerCase("en-US");
  const requestedLanguage = cleanText(body.language, 2).toLocaleLowerCase("en-US");
  const requestedProvider = cleanText(body.provider, 20).toLocaleLowerCase("en-US") as ProviderId;
  const provider: ProviderId = ["auto", "crust", "microsoft", "google"].includes(requestedProvider)
    ? requestedProvider
    : "auto";
  const language: ApiLanguage = requestedLanguage === "es" || requestedLanguage === "en"
    ? requestedLanguage
    : "pt";
  const category = resolveCategory(segment);
  const niche = category
    ? localizedCategoryLabel(category, language)
    : segment || { pt: "empresas e comércios", es: "empresas y comercios", en: "businesses and shops" }[language];

  if (city.length < 2) {
    return jsonError("Informe uma cidade válida.", 400);
  }

  if (!allowedCountries.has(country)) {
    return jsonError("Selecione um país válido.", 400);
  }

  const searchLocation = [neighborhood, city, region, countryNames[country]]
    .filter(Boolean)
    .join(", ");
  const queryText = `${niche} em ${searchLocation}`;

  const externalProvider = provider === "google" ? provider : null;
  if (externalProvider) {
    if (externalProvider === "google" && !process.env.GOOGLE_PLACES_API_KEY?.trim()) {
      return jsonError("Google Places está preparado, mas ainda precisa da chave da API.", 503);
    }

    const { data: reservationData, error: reservationError } = await user.supabase.rpc(
      "consume_prospector_leads",
      { p_requested_count: 10 },
    );
    if (reservationError) {
      console.error("Prospector quota reservation failed", reservationError);
      return jsonError("Não foi possível reservar sua franquia agora.", 502);
    }
    const reservation = Array.isArray(reservationData) ? reservationData[0] : reservationData;
    const reservedCount = Number(reservation?.allowed_count || 0);
    if (reservedCount < 1) {
      return NextResponse.json({ error: "Sua franquia mensal de leads foi atingida.", quota: reservation }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    try {
      const searched = await searchGooglePlaces({ niche, searchLocation, country, limit: reservedCount, language });
      if (!searched) throw new Error("GOOGLE_PLACES_NOT_CONFIGURED");

      const { data: savedData, error: saveError } = await user.supabase.rpc(
        "save_external_prospector_candidates",
        {
          p_provider: searched.meta.provider,
          p_query_text: queryText,
          p_filters: { segment, city, region, neighborhood, country, requested_provider: provider },
          p_candidates: searched.leads.map((lead) => ({
            source_id: lead.sourceId,
            name: lead.name,
            category: lead.category,
            address: lead.address,
            phone: lead.phone,
            website: lead.website,
            source_url: lead.sourceUrl,
            latitude: lead.latitude,
            longitude: lead.longitude,
            distance_km: lead.distanceKm,
          })),
          p_reserved_count: reservedCount,
          p_provider_billed_count: Math.min(reservedCount, searched.leads.length),
        },
      );
      if (saveError) throw saveError;

      const rows = (Array.isArray(savedData) ? savedData : []) as Array<Record<string, unknown>>;
      const leads = rows.map((row) => ({
        sourceId: String(row.provider_lead_id || row.id || ""),
        name: String(row.company_name || ""),
        category: String(row.category || niche),
        address: typeof row.address === "string" ? row.address : null,
        phone: typeof row.phone === "string" ? row.phone : null,
        website: typeof row.website === "string" ? row.website : null,
        sourceUrl: String(row.source_url || ""),
        provider: String(row.provider || searched.meta.provider),
        latitude: typeof row.latitude === "number" ? row.latitude : null,
        longitude: typeof row.longitude === "number" ? row.longitude : null,
        distanceKm: typeof row.distance_km === "number" ? row.distance_km : null,
      }));
      const { data: quotaData } = await user.supabase.rpc("get_prospector_quota");
      const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
      const crmRows = crmRowsFromLeads(
        leads as unknown as Array<Record<string, unknown>>,
        country,
        String(reservation?.tenant_id || ""),
        String(user.claims.sub),
      );
      if (crmRows.length) {
        const { error: crmSyncError } = await user.supabase
          .from("crm_leads")
          .upsert(crmRows, { onConflict: "tenant_id,phone", ignoreDuplicates: false });
        if (crmSyncError) console.error("Automatic CRM sync failed", crmSyncError);
      }
      return NextResponse.json({
        leads,
        meta: { ...searched.meta, returned: leads.length },
        quota,
        historySaved: true,
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (providerError) {
      console.error("External Prospector provider failed", providerError);
      await user.supabase.rpc("settle_prospector_quota", {
        p_reserved_count: reservedCount,
        p_delivered_count: 0,
        p_provider_billed_count: 0,
      });
      return jsonError("A fonte selecionada não respondeu agora. Sua franquia não foi consumida.", 502);
    }
  }

  let activeProvider: ProviderId = provider;
  if (provider === "auto") {
    const { data: lastSearch, error: lastSearchError } = await user.supabase
      .from("prospector_searches")
      .select("provider")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSearchError) {
      console.error("Automatic provider rotation lookup failed", lastSearchError);
    }

    const lastProvider = String(lastSearch?.provider || "").toLocaleLowerCase("en-US");
    const lastUsedCrust = /crustapi|google maps/.test(lastProvider);
    activeProvider = lastUsedCrust ? "microsoft" : "crust";
  }

  const rpcName = activeProvider === "microsoft"
    ? "run_azure_maps_prospector_search"
    : "run_crustapi_prospector_search";
  const { data, error: searchError } = await user.supabase.rpc(
    rpcName,
    {
      p_query: queryText,
      p_country: country,
      p_language: country === "br" ? "pt" : "es",
      p_filters: {
        segment,
        city,
        region,
        neighborhood,
        country,
        requested_provider: provider,
        automatic_provider: provider === "auto" ? activeProvider : null,
      },
      p_limit: 10,
    },
  );

  if (searchError) {
    console.error("CrustAPI RPC error:", searchError);
    return jsonError(
      "Não foi possível consultar as empresas agora. Tente novamente.",
      502,
    );
  }

  const result = data as {
    error?: string;
    message?: string;
    leads?: unknown[];
    quota?: unknown;
    meta?: unknown;
  };

  if (result?.error === "monthly_quota_exhausted") {
    return NextResponse.json(
      {
        error: result.message || "Sua franquia mensal de leads foi atingida.",
        quota: result.quota,
      },
      {
        status: 429,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (result?.error) {
    return NextResponse.json(
      {
        error: result.message || "Não foi possível concluir a pesquisa.",
        quota: result.quota,
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const resultLeads = Array.isArray(result?.leads) ? result.leads as Array<Record<string, unknown>> : [];
  const resultQuota = Array.isArray(result?.quota) ? result.quota[0] : result?.quota;
  const crmRows = crmRowsFromLeads(
    resultLeads,
    country,
    String((resultQuota as Record<string, unknown> | undefined)?.tenant_id || user.profile?.tenant_id || ""),
    String(user.claims.sub),
  );
  if (crmRows.length) {
    const { error: crmSyncError } = await user.supabase
      .from("crm_leads")
      .upsert(crmRows, { onConflict: "tenant_id,phone", ignoreDuplicates: false });
    if (crmSyncError) console.error("Automatic CRM sync failed", crmSyncError);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
