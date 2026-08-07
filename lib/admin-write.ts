import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Writes an admin row, tolerating columns the database does not have yet.
 *
 * The SQL migrations in supabase/ are run by hand, so the code can be ahead of
 * the schema. PostgREST rejects the whole statement when one column is unknown,
 * which would lose the entire edit — silently, because the admin pages do not
 * surface fetch errors.
 *
 * Postgres names the offending column in the error, so rather than guessing at
 * which keys might be new, drop exactly the one it complained about and try
 * again. The edit saves either way, and the dropped fields start persisting the
 * moment the migration is run.
 */

type Row = Record<string, unknown>;

/** The column name out of a PostgREST / Postgres "unknown column" error. */
function unknownColumn(error: { code?: string; message?: string } | null): string | null {
  if (!error?.message) return null;

  // PGRST204: Could not find the 'foo' column of 'bar' in the schema cache
  const cache = /could not find the '([^']+)' column/i.exec(error.message);
  if (cache) return cache[1];

  // 42703: column "foo" of relation "bar" does not exist
  const undefinedCol = /column "([^"]+)" of relation/i.exec(error.message);
  if (undefinedCol) return undefinedCol[1];

  if (error.code === "42703" || error.code === "PGRST204") {
    const bare = /'([^']+)'|"([^"]+)"/.exec(error.message);
    if (bare) return bare[1] ?? bare[2];
  }
  return null;
}

/**
 * Retries a write, shedding one unknown column at a time. Bounded by the number
 * of keys, so a persistent failure surfaces as a real error rather than looping.
 */
async function writeShedding<R extends { error: { code?: string; message?: string } | null }>(
  row: Row,
  attempt: (r: Row) => PromiseLike<R>,
): Promise<R> {
  const current = { ...row };

  for (let i = 0; i <= Object.keys(row).length; i++) {
    const result = await attempt(current);
    const column = unknownColumn(result.error);
    // Nothing to shed, or the column is not one we sent — hand the error back.
    if (!column || !(column in current)) return result;
    delete current[column];
  }

  return attempt(current);
}

export async function insertRow(table: string, row: Row) {
  return writeShedding(row, (r) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdminLive.from(table).insert([r] as any).select().single(),
  );
}

export async function updateRow(table: string, id: string, row: Row) {
  const patch = { ...row, updated_at: new Date().toISOString() };
  return writeShedding(patch, (r) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdminLive.from(table).update(r as any).eq("id", id).select().single(),
  );
}
