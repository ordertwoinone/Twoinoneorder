import { supabaseAdminLive } from "@/lib/supabase-admin";
import {
  describeOrderSource,
  type OrderSource,
  type OrderSourceRow,
} from "@/lib/order-source";
import { memo, TTL } from "@/lib/pos/cache";

/**
 * Putting names to the ids a booking row stores.
 *
 * Both lookup tables are tiny — one row per panel, one per member of staff — so
 * they are read whole and indexed in memory rather than joined per order. The
 * board asks for this once for a hundred orders, and an embed would make
 * PostgREST resolve the same two names a hundred times.
 *
 * Neither lookup is allowed to fail the caller. A missing device or a deleted
 * staff row leaves the order describing itself by channel alone, which is worth
 * more than an invoice that will not render.
 *
 * Held for a minute, because the order board asks for it every fifteen seconds
 * on every tablet in the branch and it is four queries each time. What it
 * answers — the name of a panel, the name of a cashier, the two order prefixes
 * — changes when somebody edits it in admin, which is roughly never during a
 * service, and being a minute behind on a label costs nobody anything.
 */

export interface SourceDirectory {
  devices: Map<string, string>;
  staff: Map<string, string>;
  prefixes: { pos: string; kiosk: string };
}

export const loadSourceDirectory = memo<SourceDirectory>("pos:source-directory", TTL.directory, async () => {
  const [deviceRes, staffRes, posRes, kioskRes] = await Promise.all([
    supabaseAdminLive.from("kiosk_devices").select("id, label"),
    supabaseAdminLive.from("pos_staff").select("id, name"),
    supabaseAdminLive.from("pos_settings").select("order_prefix").maybeSingle(),
    supabaseAdminLive.from("kiosk_settings").select("order_prefix").maybeSingle(),
  ]);

  const devices = new Map<string, string>();
  for (const row of (deviceRes.data ?? []) as { id: string; label: string }[]) {
    devices.set(row.id, row.label);
  }

  const staff = new Map<string, string>();
  for (const row of (staffRes.data ?? []) as { id: string; name: string }[]) {
    staff.set(row.id, row.name);
  }

  return {
    devices,
    staff,
    prefixes: {
      pos: (posRes.data as { order_prefix?: string } | null)?.order_prefix || "ORD",
      kiosk: (kioskRes.data as { order_prefix?: string } | null)?.order_prefix || "TIO",
    },
  };
});

/** One row read against an already-loaded directory. */
export function sourceFrom(row: OrderSourceRow, dir: SourceDirectory): OrderSource {
  return describeOrderSource(
    row,
    {
      device: row.kiosk_device_id ? dir.devices.get(row.kiosk_device_id) : null,
      staff: row.pos_staff_uuid ? dir.staff.get(row.pos_staff_uuid) : null,
    },
    dir.prefixes,
  );
}

/** The whole job for a single order, for the invoice pages. */
export async function orderSourceFor(row: OrderSourceRow): Promise<OrderSource> {
  return sourceFrom(row, await loadSourceDirectory());
}
