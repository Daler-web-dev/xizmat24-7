"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "../_shared";
import type { ActionResult, Tuman } from "@/types";

/** All tumans for one region, ordered. */
export async function listTumans(
  initDataRaw: string,
  regionId: number
): Promise<ActionResult<Tuman[]>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  if (!Number.isFinite(regionId) || regionId <= 0) {
    return { ok: false, error: "Не указан регион", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("tumans")
    .select("*")
    .eq("region_id", regionId)
    .order("sort_order");

  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };
  return { ok: true, data: (res.data ?? []) as Tuman[] };
}
