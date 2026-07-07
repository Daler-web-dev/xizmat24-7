"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

/**
 * Search workers by name/surname (single `name` field), phone, or service
 * (subcategory name in RU or UZ). Results are the union of all three, most
 * recent first.
 */
export async function searchWorkers(
  initDataRaw: string,
  query: string
): Promise<ActionResult<WorkerView[]>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const q = (query ?? "").trim();
  if (!q) return { ok: true, data: [] };

  const supabase = getSupabaseAdmin();

  // Strip characters that are ILIKE wildcards or break PostgREST or-filters.
  const safe = q.replace(/[%_\\,()*]/g, " ").trim();

  // Phone term: prefer the normalized E.164, else fall back to raw digits.
  const normalized = normalizePhone(q);
  const phoneTerm =
    normalized.ok && normalized.normalized
      ? normalized.normalized.replace(/[^\d+]/g, "")
      : q.replace(/\D/g, "");

  if (!safe && !phoneTerm) return { ok: true, data: [] };

  const ids = new Set<string>();

  // 1. Name / surname.
  if (safe) {
    const byName = await supabase.from("workers").select("id").ilike("name", `%${safe}%`).limit(50);
    if (byName.error) return { ok: false, error: byName.error.message, code: "SERVER" };
    for (const r of byName.data ?? []) ids.add(r.id as string);
  }

  // 2. Phone (digit substring).
  if (phoneTerm) {
    const byPhone = await supabase
      .from("workers")
      .select("id")
      .ilike("phone", `%${phoneTerm}%`)
      .limit(50);
    if (byPhone.error) return { ok: false, error: byPhone.error.message, code: "SERVER" };
    for (const r of byPhone.data ?? []) ids.add(r.id as string);
  }

  // 3. Service: match subcategory name (RU or UZ) -> workers linked to it.
  if (safe) {
    const subs = await supabase
      .from("subcategories")
      .select("id")
      .or(`name_ru.ilike.%${safe}%,name_uz.ilike.%${safe}%`)
      .limit(200);
    if (subs.error) return { ok: false, error: subs.error.message, code: "SERVER" };
    const subIds = (subs.data ?? []).map((s) => s.id as number);
    if (subIds.length > 0) {
      const links = await supabase
        .from("worker_subcategories")
        .select("worker_id")
        .in("subcategory_id", subIds)
        .limit(300);
      if (links.error) return { ok: false, error: links.error.message, code: "SERVER" };
      for (const r of links.data ?? []) ids.add(r.worker_id as string);
    }
  }

  if (ids.size === 0) return { ok: true, data: [] };

  // Fetch the full joined rows for the matched workers.
  const res = await supabase
    .from("workers")
    .select(WORKER_SELECT)
    .in("id", Array.from(ids))
    .order("created_at", { ascending: false })
    .limit(50);

  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };

  return { ok: true, data: (res.data ?? []).map(mapWorkerView) };
}
