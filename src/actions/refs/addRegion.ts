"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { regionInputSchema, type RegionInput } from "@/lib/schemas";
import { requireAdmin } from "../_shared";
import type { ActionResult, Region } from "@/types";

/** Add a new region (city). name_ru is the natural key — duplicates rejected. */
export async function addRegion(
  initDataRaw: string,
  input: RegionInput
): Promise<ActionResult<Region>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const parsed = regionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Неверные данные", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();

  // Place new region after the current max sort_order.
  const max = await supabase
    .from("regions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (max.data?.sort_order ?? 0) + 1;

  // RU is optional — fall back to the UZ name when the admin left it blank.
  const nameUz = parsed.data.name_uz.trim();
  const nameRu = parsed.data.name_ru.trim() || nameUz;

  const res = await supabase
    .from("regions")
    .insert({
      name_ru: nameRu,
      name_uz: nameUz,
      sort_order: nextSort,
    })
    .select("*")
    .single();

  if (res.error) {
    if (res.error.code === "23505") {
      return { ok: false, error: "Такой регион уже есть.", code: "DUPLICATE" };
    }
    return { ok: false, error: res.error.message, code: "SERVER" };
  }

  return { ok: true, data: res.data as Region };
}
