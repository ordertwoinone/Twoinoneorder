import { supabaseAdminLive } from "@/lib/supabase-admin";
import {
  normalizeInvoiceSettings,
  type InvoiceSettings,
} from "@/lib/invoice-settings";

/**
 * Reading the invoice's wording from the server.
 *
 * supabase/invoice_settings.sql is run by hand, so a missing table means
 * "nothing customised" rather than an error — the invoice prints with the
 * wording it ships with and starts obeying admin the moment it is run.
 */
export async function getInvoiceSettings(): Promise<InvoiceSettings & { id?: string }> {
  const { data, error } = await supabaseAdminLive
    .from("invoice_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) return normalizeInvoiceSettings(null);

  const row = data as Record<string, unknown>;
  return {
    ...normalizeInvoiceSettings(row as Parameters<typeof normalizeInvoiceSettings>[0]),
    id: typeof row.id === "string" ? row.id : undefined,
  };
}
