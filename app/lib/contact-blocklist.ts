// Lista de bloqueio "não contatar" do CRM (LGPD art. 18 e oposição à prospecção).
// Guarda só o SHA-256 dos dígitos do telefone, nunca o número em texto.
import type { SupabaseClient } from "@supabase/supabase-js";

// Tabela ainda não criada no banco (migração pendente de aprovação): o CRM continua funcionando.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export function isMissingTableError(error: { code?: string } | null | undefined) {
  return Boolean(error?.code && MISSING_TABLE_CODES.has(error.code));
}

export async function phoneHash(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(digits));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Remove das linhas os telefones que estão na lista de bloqueio da empresa.
// Retorna null quando não foi possível conferir a lista (aí ninguém é gravado no CRM).
export async function withoutBlockedPhones<T extends { phone?: unknown }>(
  supabase: SupabaseClient,
  tenantId: string,
  rows: T[],
): Promise<T[] | null> {
  if (!rows.length || !tenantId) return rows;
  const hashed = await Promise.all(rows.map(async (row) => ({ row, hash: await phoneHash(String(row.phone || "")) })));
  const { data, error } = await supabase
    .from("crm_contact_blocklist")
    .select("phone_hash")
    .eq("tenant_id", tenantId)
    .in("phone_hash", [...new Set(hashed.map((item) => item.hash))]);
  if (error) {
    if (isMissingTableError(error)) return rows;
    console.error("CRM blocklist lookup failed", { code: error.code });
    return null;
  }
  const blocked = new Set((data || []).map((item: { phone_hash: string }) => item.phone_hash));
  return hashed.filter((item) => !blocked.has(item.hash)).map((item) => item.row);
}
