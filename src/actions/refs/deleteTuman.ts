"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "../_shared";
import type { ActionResult } from "@/types";

/**
 * Delete a tuman. Workers referencing it have tuman_id set to null
 * (FK on delete set null) — no worker rows are removed.
 */
export async function deleteTuman(
  initDataRaw: string,
  tumanId: number
): Promise<ActionResult<{ id: number; affectedWorkers: number }>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  if (!Number.isFinite(tumanId) || tumanId <= 0) {
    return { ok: false, error: "Не указан туман", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();

  // Count workers that will lose this tuman (info for the UI).
  const count = await supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("tuman_id", tumanId);
  const affectedWorkers = count.count ?? 0;

  const res = await supabase.from("tumans").delete().eq("id", tumanId);
  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };

  return { ok: true, data: { id: tumanId, affectedWorkers } };
}
