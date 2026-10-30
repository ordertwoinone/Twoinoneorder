import { supabaseAdmin, supabaseAdminLive } from "@/lib/supabase-admin";

export interface KitchenTableOption {
  code: string;
  section: string;
  section_ar?: string | null;
  seats: string;
  status: string;
}

/**
 * The tables a guest can choose on /kitchens.
 *
 * Until supabase/kitchen_tables.sql has been run the booking page's list stands
 * in, so the popup keeps working. Once it has, this list alone decides, and an
 * empty one means the popup only asks for the party size.
 */
export async function getKitchenTables(live = false): Promise<KitchenTableOption[]> {
  const client = live ? supabaseAdminLive : supabaseAdmin;

  const { data, error } = await client
    .from("kitchen_tables")
    .select("code, section, section_ar, seats")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!error) return (data ?? []).map((t) => ({ ...t, status: "available" })) as KitchenTableOption[];

  const { data: booking } = await client
    .from("booking_tables")
    .select("code, section, seats, status")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (booking ?? []) as KitchenTableOption[];
}

export interface KitchenTableRow {
  code: string;
  seats: string;
  section: string;
  section_ar: string;
  sort_order: number;
  is_active: boolean;
}

/** Checks an admin form submission and keeps only the columns it may set. */
export function parseKitchenTable(body: Record<string, unknown>): { row: KitchenTableRow } | { error: string } {
  const code = String(body?.code ?? "").trim().toUpperCase().slice(0, 20);
  const seats = String(body?.seats ?? "").trim().slice(0, 20);
  if (!code) return { error: "Enter a table name, such as T1." };
  if (!/\d/.test(seats)) return { error: "Enter the seats, such as 4 or 8–10." };
  return {
    row: {
      code,
      seats,
      section: String(body?.section ?? "").trim().slice(0, 80),
      section_ar: String(body?.section_ar ?? "").trim().slice(0, 80),
      sort_order: Number.isInteger(Number(body?.sort_order)) ? Number(body?.sort_order) : 0,
      is_active: body?.is_active !== false,
    },
  };
}

export const clashMessage = (code: string) => `There is already a table called ${code}.`;
