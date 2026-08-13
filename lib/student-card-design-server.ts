import { supabaseAdmin, supabaseAdminLive } from "@/lib/supabase-admin";
import { normalizeCardDesign, type StudentCardDesign } from "@/lib/student-card-design";

/**
 * Reading the card's design from the server.
 *
 * supabase/student_card_design.sql is run by hand, so a missing table means
 * "nothing has been customised" rather than an error — the card falls back to
 * the wording and colours it ships with, and starts obeying admin the moment
 * the migration is run.
 */

/** For the public pages, which are cached like the rest of their data. */
export async function getStudentCardDesign(): Promise<StudentCardDesign> {
  const { data, error } = await supabaseAdmin
    .from("student_card_design")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return normalizeCardDesign(null);
  return normalizeCardDesign(data as Parameters<typeof normalizeCardDesign>[0]);
}

/** For the admin panel, which must never read back its own last write stale. */
export async function getStudentCardDesignLive(): Promise<
  StudentCardDesign & { id?: string }
> {
  const { data, error } = await supabaseAdminLive
    .from("student_card_design")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) return normalizeCardDesign(null);

  const row = data as Record<string, unknown>;
  return {
    ...normalizeCardDesign(row as Parameters<typeof normalizeCardDesign>[0]),
    id: typeof row.id === "string" ? row.id : undefined,
  };
}
