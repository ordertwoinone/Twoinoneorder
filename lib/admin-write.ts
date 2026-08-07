import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Writes an admin row, tolerating a database that has not run
 * supabase/arabic_translations.sql yet.
 *
 * PostgREST rejects the whole statement if one column is unknown, so a form
 * that now posts `title_ar` would fail to save entirely — silently, because the
 * admin pages do not surface the error. Rather than lose the edit, drop the
 * Arabic keys and write the rest, so the panel keeps working and the
 * translations start saving the moment the migration is run.
 */

/** Postgres "undefined column" and the PostgREST schema-cache equivalent. */
function isUnknownColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? "")
  );
}

type Row = Record<string, unknown>;

function withoutArabic(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k.endsWith("_ar")) out[k] = v;
  }
  return out;
}

/* The generated Supabase types are not in this project, so these tables are
   untyped from the client's point of view — the casts keep that explicit
   rather than fighting the library's excess-property guard. */
export async function insertRow(table: string, row: Row) {
  const write = (r: Row) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdminLive.from(table).insert([r] as any).select().single();

  const first = await write(row);
  if (!isUnknownColumn(first.error)) return first;
  return write(withoutArabic(row));
}

export async function updateRow(table: string, id: string, row: Row) {
  const patch = { ...row, updated_at: new Date().toISOString() };
  const write = (r: Row) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdminLive.from(table).update(r as any).eq("id", id).select().single();

  const first = await write(patch);
  if (!isUnknownColumn(first.error)) return first;
  return write(withoutArabic(patch));
}
