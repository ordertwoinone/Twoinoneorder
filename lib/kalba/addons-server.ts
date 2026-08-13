import { supabaseAdmin, supabaseAdminLive } from "@/lib/supabase-admin";
import { groupAddons, type KalbaAddon } from "@/lib/kalba/addons";

/**
 * Reading and writing the add-ons table from the server.
 *
 * supabase/kalba_item_addons.sql is run by hand, so every function here treats a
 * missing table as "no item has add-ons" rather than an error. That keeps the
 * branch page rendering and the admin panel saving on a database that has not
 * caught up yet — the add-ons simply start working the moment it is run.
 */

/* `*` rather than a column list: image_url was added to the migration after the
   first copies of it had been run, and PostgREST rejects the whole select when
   one named column is unknown — which would have emptied every add-on list
   rather than just leaving out the picture. */
const COLUMNS = "*";

export interface AddonInput {
  id?: string;
  name: string;
  name_ar?: string;
  image_url?: string;
  price: number | string;
  sort_order?: number;
}

/** Active add-ons for every item, keyed by item id. Never throws. */
export async function getAddonsByItem(): Promise<Record<string, KalbaAddon[]>> {
  const { data, error } = await supabaseAdmin
    .from("kalba_item_addons")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return {};
  return groupAddons(data as unknown as KalbaAddon[]);
}

/** Every add-on including the switched-off ones — the admin panel edits these. */
export async function getAllAddonsByItem(): Promise<Record<string, KalbaAddon[]>> {
  const { data, error } = await supabaseAdminLive
    .from("kalba_item_addons")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });

  if (error || !data) return {};
  return groupAddons(data as unknown as KalbaAddon[]);
}

/**
 * Makes the stored add-ons match what the admin panel just sent.
 *
 * Rows the form dropped are deleted, the rest are inserted or updated in place —
 * updating rather than replacing wholesale so an add-on keeps its id, and a cart
 * open in another tab does not lose the extra it had ticked.
 *
 * Returns quietly on a missing table: the item itself has already saved, and
 * failing loudly here would make a working edit look broken.
 */
export async function syncItemAddons(itemId: string, addons: AddonInput[]): Promise<void> {
  const rows = addons
    .map((addon, index) => ({
      id: addon.id,
      name: (addon.name ?? "").trim(),
      name_ar: (addon.name_ar ?? "").trim(),
      image_url: (addon.image_url ?? "").trim(),
      price: Number(addon.price) || 0,
      sort_order: addon.sort_order ?? index,
    }))
    // A blank name is a row the admin started and abandoned, not an add-on.
    .filter((row) => row.name !== "");

  const { data: existing, error: readError } = await supabaseAdminLive
    .from("kalba_item_addons")
    .select("id")
    .eq("item_id", itemId);

  if (readError) return;

  const keptIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);
  const goneIds = (existing ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !keptIds.has(id));

  if (goneIds.length > 0) {
    await supabaseAdminLive.from("kalba_item_addons").delete().in("id", goneIds);
  }

  const updates = rows.filter((row) => row.id);
  const inserts = rows.filter((row) => !row.id);

  await Promise.all([
    ...updates.map((row) =>
      tolerate((fields) =>
        supabaseAdminLive
          .from("kalba_item_addons")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", row.id as string),
      )({
        name: row.name,
        name_ar: row.name_ar,
        image_url: row.image_url,
        price: row.price,
        sort_order: row.sort_order,
      }),
    ),
    inserts.length > 0
      ? tolerate((fields) =>
          supabaseAdminLive.from("kalba_item_addons").insert(
            inserts.map((row) => ({
              item_id: itemId,
              name: row.name,
              name_ar: row.name_ar,
              price: row.price,
              sort_order: row.sort_order,
              ...(("image_url" in fields) ? { image_url: row.image_url } : {}),
            })),
          ),
        )({ image_url: "" })
      : Promise.resolve(),
  ]);
}

/**
 * Runs a write, and retries once without `image_url` if the column is unknown.
 *
 * That column arrived after the first copies of the migration had been run, so a
 * database can have the table but not the picture. Dropping the one field beats
 * losing the whole edit — and it starts saving the moment the file is re-run.
 */
function tolerate<T extends Record<string, unknown>>(
  attempt: (fields: T) => PromiseLike<{ error: { message?: string } | null }>,
) {
  return async (fields: T) => {
    const result = await attempt(fields);
    if (!result.error?.message || !/image_url/i.test(result.error.message)) return result;

    const rest = { ...fields };
    delete rest.image_url;
    return attempt(rest);
  };
}
