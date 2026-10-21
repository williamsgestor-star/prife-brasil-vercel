import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "../../lib/supabase/access";
import { BR_STATES, ISO_COUNTRY, REGIONS } from "../../leads/geo-data";

// Listas automáticas do Prospector:
// - cidades do Brasil: IBGE (lista oficial de municípios por estado);
// - cidades dos outros países e bairros: OpenStreetMap (Overpass), quando o mapa tiver os dados.
// As respostas ficam em cache por 30 dias.

const MONTH = 60 * 60 * 24 * 30;
const OVERPASS = "https://overpass-api.de/api/interpreter";

const clean = (value: string | null) => (value ?? "").normalize("NFC").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 70);
const rx = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, "");
const unique = (items: string[]) => [...new Set(items.map((i) => i.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")).slice(0, 1500);

async function overpass(query: string): Promise<string[]> {
  const response = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "prife-brasil-prospector/1.0" },
    body: "data=" + encodeURIComponent(query),
    next: { revalidate: MONTH },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { elements?: { tags?: { name?: string } }[] };
  return unique((data.elements ?? []).map((element) => element.tags?.name ?? ""));
}

export async function GET(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const country = (params.get("country") ?? "br").toLowerCase();
  const region = clean(params.get("region"));
  const city = clean(params.get("city"));
  const headers = { "Cache-Control": "private, max-age=86400" };
  if (!ISO_COUNTRY[country] || !REGIONS[country].includes(region)) return NextResponse.json({ items: [] }, { headers });

  try {
    if (type === "cities") {
      if (country === "br") {
        const uf = BR_STATES[region];
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, { next: { revalidate: MONTH }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) return NextResponse.json({ items: [] }, { headers });
        const list = (await response.json()) as { nome: string }[];
        return NextResponse.json({ items: unique(list.map((item) => item.nome)) }, { headers });
      }
      const items = await overpass(`[out:json][timeout:20];area["ISO3166-1"="${ISO_COUNTRY[country]}"]->.c;rel(area.c)["boundary"="administrative"]["admin_level"="4"]["name"~"${rx(region)}",i];map_to_area->.s;node(area.s)["place"~"^(city|town)$"];out tags;`);
      return NextResponse.json({ items }, { headers });
    }

    if (type === "neighborhoods" && city.length >= 2) {
      const items = await overpass(`[out:json][timeout:20];area["ISO3166-1"="${ISO_COUNTRY[country]}"]->.c;rel(area.c)["boundary"="administrative"]["admin_level"="4"]["name"~"${rx(region)}",i];map_to_area->.s;rel(area.s)["boundary"="administrative"]["admin_level"~"^(6|7|8)$"]["name"~"^${rx(city)}$",i];map_to_area->.m;(node(area.m)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.m)["place"~"^(suburb|neighbourhood|quarter)$"];rel(area.m)["place"~"^(suburb|neighbourhood|quarter)$"];);out tags;`);
      return NextResponse.json({ items }, { headers });
    }
  } catch {
    return NextResponse.json({ items: [] }, { headers });
  }
  return NextResponse.json({ items: [] }, { headers });
}
