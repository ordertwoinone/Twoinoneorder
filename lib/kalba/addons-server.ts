import { supabaseAdmin, supabaseAdminLive } from "@/lib/supabase-admin";
import { buildGroups, type KalbaAddon, type KalbaAddonGroup } from "@/lib/kalba/addons";

/**
 * Reading and writing choice groups from the server.
 *
 * The SQL in supabase/ is run by hand, so every function here treats a missing
 * table as "this item asks nothing" rather than an error. That keeps the branch
 * page rendering and the admin panel saving on a database that has not caught
 * up — the questions simply start working the moment the migrations are run.
 */

/* `*` rather than a column list: these tables have gained columns between
   copies of the migration, and PostgREST rejects the whole select when one
   named column is unknown — which would empty every list rather than leave out
   the one field. */
const COLUMNS = "*";

/** What the loose pre-groups add-ons are gathered under. */
const LOOSE_LABEL = "Extras";

export interface AddonInput {
  id?: string;
  name: string;
  name_ar?: string;
  image_url?: string;
  price: number | string;
  sort_order?: number;
}

export interface GroupInput {
  id?: string;
  name: string;
  name_ar?: string;
  min_select?: number;
  max_select?: number;
  sort_order?: number;
  options: AddonInput[];
}

type GroupRow = Omit<KalbaAddonGroup, "options">;

async function read(live: boolean) {
  const client = live ? supabaseAdminLive : supabaseAdmin;

  const [groupsRes, addonsRes] = await Promise.all([
    client.from("kalba_addon_groups").select(COLUMNS).order("sort_order", { ascending: true }),
    live
      ? client.from("kalba_item_addons").select(COLUMNS).order("sort_order", { ascending: true })
      : client
          .from("kalba_item_addons")
          .select(COLUMNS)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
  ]);

  return {
    groups: (groupsRes.error ? [] : (groupsRes.data ?? [])) as unknown as GroupRow[],
    addons: (addonsRes.error ? [] : (addonsRes.data ?? [])) as unknown as KalbaAddon[],
  };
}

/** Every item's questions, keyed by item id. For the public pages. */
export async function getAddonGroupsByItem(): Promise<Record<string, KalbaAddonGroup[]>> {
  const { groups, addons } = await read(false);
  return buildGroups(groups, addons, LOOSE_LABEL);
}

/** The same, read live and including switched-off options — for the admin panel. */
export async function getAllAddonGroupsByItem(): Promise<Record<string, KalbaAddonGroup[]>> {
  const { groups, addons } = await read(true);
  return buildGroups(groups, addons, LOOSE_LABEL);
}

/**
 * Makes an item's stored questions match what the admin panel just sent.
 *
 * Groups and options the form dropped are deleted; the rest are updated in place
 * so an option keeps its id, and a cart open in another tab does not lose the
 * answer it had ticked. Returns quietly if the tables are not there: the item
 * itself has already saved, and failing loudly would make a working edit look
 * broken.
 */
export async function syncItemAddonGroups(itemId: string, groups: GroupInput[]): Promise<void> {
  const clean = groups
    .map((group, index) => ({
      id: group.id,
      name: (group.name ?? "").trim(),
      name_ar: (group.name_ar ?? "").trim(),
      min_select: Math.max(0, Number(group.min_select) || 0),
      max_select: Math.max(0, Number(group.max_select) || 0),
      sort_order: group.sort_order ?? index,
      options: (group.options ?? [])
        .map((option, i) => ({
          id: option.id,
          name: (option.name ?? "").trim(),
          name_ar: (option.name_ar ?? "").trim(),
          image_url: (option.image_url ?? "").trim(),
          price: Number(option.price) || 0,
          sort_order: option.sort_order ?? i,
        }))
        // A blank name is a row the admin started and abandoned, not an option.
        .filter((option) => option.name !== ""),
    }))
    .filter((group) => group.name !== "" && group.options.length > 0);

  const { data: existingGroups, error: groupsError } = await supabaseAdminLive
    .from("kalba_addon_groups")
    .select("id")
    .eq("item_id", itemId);

  if (groupsError) return;

  const keptGroupIds = new Set(clean.map((g) => g.id).filter(Boolean) as string[]);
  const goneGroupIds = (existingGroups ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !keptGroupIds.has(id));

  // The options cascade with their group.
  if (goneGroupIds.length > 0) {
    await supabaseAdminLive.from("kalba_addon_groups").delete().in("id", goneGroupIds);
  }

  for (const group of clean) {
    const fields = {
      name: group.name,
      name_ar: group.name_ar,
      min_select: group.min_select,
      max_select: group.max_select,
      sort_order: group.sort_order,
    };

    let groupId = group.id;

    if (groupId) {
      await supabaseAdminLive
        .from("kalba_addon_groups")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", groupId);
    } else {
      const { data, error } = await supabaseAdminLive
        .from("kalba_addon_groups")
        .insert([{ ...fields, item_id: itemId }])
        .select("id")
        .single();
      if (error || !data) continue;
      groupId = (data as { id: string }).id;
    }

    await syncGroupOptions(itemId, groupId, group.options);
  }
}

async function syncGroupOptions(
  itemId: string,
  groupId: string,
  options: Required<AddonInput>[] | { id?: string; name: string; name_ar: string; image_url: string; price: number; sort_order: number }[],
): Promise<void> {
  const { data: existing, error } = await supabaseAdminLive
    .from("kalba_item_addons")
    .select("id")
    .eq("group_id", groupId);

  if (error) return;

  const keptIds = new Set(options.map((o) => o.id).filter(Boolean) as string[]);
  const goneIds = (existing ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id) => !keptIds.has(id));

  if (goneIds.length > 0) {
    await supabaseAdminLive.from("kalba_item_addons").delete().in("id", goneIds);
  }

  await Promise.all(
    options.map((option) => {
      const fields = {
        item_id: itemId,
        group_id: groupId,
        name: option.name,
        name_ar: option.name_ar,
        image_url: option.image_url,
        price: option.price,
        sort_order: option.sort_order,
      };

      return option.id
        ? tolerate((f) =>
            supabaseAdminLive
              .from("kalba_item_addons")
              .update({ ...f, updated_at: new Date().toISOString() })
              .eq("id", option.id as string),
          )(fields)
        : tolerate((f) => supabaseAdminLive.from("kalba_item_addons").insert([f]))(fields);
    }),
  );
}

/**
 * Runs a write, retrying once without a column the database has not got.
 *
 * image_url and group_id both arrived after earlier copies of the migrations had
 * been run. Dropping the one field beats losing the edit, and it starts saving
 * the moment the newer file is run.
 */
function tolerate<T extends Record<string, unknown>>(
  attempt: (fields: T) => PromiseLike<{ error: { message?: string } | null }>,
) {
  return async (fields: T) => {
    const result = await attempt(fields);
    const message = result.error?.message;
    if (!message) return result;

    for (const column of ["image_url", "group_id"]) {
      if (message.includes(column) && column in fields) {
        const rest = { ...fields };
        delete rest[column];
        return attempt(rest);
      }
    }
    return result;
  };
}
