"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { tumanInputSchema, type TumanInput } from "@/lib/schemas";
import { requireAdmin } from "../_shared";
import type { ActionResult, Tuman } from "@/types";

/** Add a tuman/district under a region. (region_id, name_ru) is unique. */
export async function addTuman(
  initDataRaw: string,
  input: TumanInput
): Promise<ActionResult<Tuman>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const parsed = tumanInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Неверные данные", code: "VALIDATION" };
  }
  const data = parsed.data;

  const supabase = getSupabaseAdmin();

  // Ensure the region exists.
  const region = await supabase.from("regions").select("id").eq("id", data.regionId).maybeSingle();
  if (region.error) return { ok: false, error: region.error.message, code: "SERVER" };
  if (!region.data) return { ok: false, error: "Регион не найден", code: "VALIDATION" };

  // Place after the current max sort_order within the region.
  const max = await supabase
    .from("tumans")
    .select("sort_order")
    .eq("region_id", data.regionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (max.data?.sort_order ?? 0) + 1;

  // RU is optional — fall back to the UZ name when the admin left it blank.
  const nameUz = data.name_uz.trim();
  const nameRu = data.name_ru.trim() || nameUz;

  const res = await supabase
    .from("tumans")
    .insert({
      region_id: data.regionId,
      name_ru: nameRu,
      name_uz: nameUz,
      sort_order: nextSort,
    })
    .select("*")
    .single();

  if (res.error) {
    if (res.error.code === "23505") {
      return { ok: false, error: "Такой туман уже есть в этом регионе.", code: "DUPLICATE" };
    }
    return { ok: false, error: res.error.message, code: "SERVER" };
  }

  return { ok: true, data: res.data as Tuman };
}
