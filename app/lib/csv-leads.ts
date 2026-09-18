export type CsvLead = {
  name: string;
  phone: string;
  category: string;
  email: string;
  address: string;
  website: string;
  country: string;
  source: string;
};

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/, 8).join("\n");
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;
    for (const char of sample) {
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === candidate) count += 1;
    }
    if (count > bestCount) { best = candidate; bestCount = count; }
  }
  return best;
}

function parseRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function findColumn(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)));
}

export function parseCsvLeads(source: string) {
  const text = source.replace(/^\uFEFF/, "").trim();
  if (!text) return { leads: [] as CsvLead[], error: "empty" as const };
  const rows = parseRows(text, detectDelimiter(text));
  if (rows.length < 2) return { leads: [] as CsvLead[], error: "empty" as const };

  const headers = rows[0].map(normalizeHeader);
  const nameIndex = findColumn(headers, ["nome", "name", "empresa", "company", "business", "estabelecimento", "razao social", "fantasia"]);
  const phoneIndex = findColumn(headers, ["telefone", "phone", "whatsapp", "celular", "mobile", "fone", "contact number"]);
  if (nameIndex < 0 || phoneIndex < 0) return { leads: [] as CsvLead[], error: "headers" as const };

  const segmentIndex = findColumn(headers, ["segmento", "nicho", "category", "categoria", "setor", "industry"]);
  const emailIndex = findColumn(headers, ["email", "e mail"]);
  const addressIndex = findColumn(headers, ["endereco", "direccion", "address", "localizacao", "location"]);
  const websiteIndex = findColumn(headers, ["website", "site", "url"]);
  const countryIndex = findColumn(headers, ["pais", "country"]);
  const valueAt = (row: string[], index: number) => index >= 0 ? String(row[index] || "").trim() : "";
  const leads = rows.slice(1).flatMap((row) => {
    const name = valueAt(row, nameIndex);
    const phone = valueAt(row, phoneIndex);
    if (!name || !phone) return [];
    return [{ name, phone, category: valueAt(row, segmentIndex), email: valueAt(row, emailIndex), address: valueAt(row, addressIndex), website: valueAt(row, websiteIndex), country: valueAt(row, countryIndex), source: "CSV" }];
  });
  return { leads, error: leads.length ? null : "rows" as const };
}
