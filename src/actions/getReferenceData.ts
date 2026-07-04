"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "./_shared";
import type {
  ActionResult,
  Category,
  Region,
  Subcategory,
  Tuman,
} from "@/types";

export interface ReferenceData {
  regions: Region[];
  tumans: Tuman[];
  categories: Category[];
  subcategories: Subcategory[];
}

/** Load all catalog data (regions, tumans, categories, subcategories). */
export async function getReferenceData(
  initDataRaw: string
): Promise<ActionResult<ReferenceData>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const supabase = getSupabaseAdmin();

  const [regionsRes, tumansRes, categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("regions").select("*").order("sort_order"),
    supabase.from("tumans").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("subcategories").select("*").order("sort_order"),
  ]);

  const firstError =
    regionsRes.error || tumansRes.error || categoriesRes.error || subcategoriesRes.error;
  if (firstError) {
    return { ok: false, error: firstError.message, code: "SERVER" };
  }

  return {
    ok: true,
    data: {
      regions: (regionsRes.data ?? []) as Region[],
      tumans: (tumansRes.data ?? []) as Tuman[],
      categories: (categoriesRes.data ?? []) as Category[],
      subcategories: (subcategoriesRes.data ?? []) as Subcategory[],
    },
  };
}
