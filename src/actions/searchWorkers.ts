"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

/** Search by name (ILIKE) or by phone (normalized, then digit substring). */
export async function searchWorkers(
  initDataRaw: string,
  query: string
): Promise<ActionResult<WorkerView[]>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const q = (query ?? "").trim();
  if (!q) return { ok: true, data: [] };

  const supabase = getSupabaseAdmin();

  // Sanitize for PostgREST or-filter (commas/parens break the syntax).
  const safe = q.replace(/[,()*]/g, " ").trim();

  // Phone term: prefer the normalized E.164, else fall back to raw digits.
  const normalized = normalizePhone(q);
  const phoneTerm = normalized.ok && normalized.normalized
    ? normalized.normalized.replace(/[^\d+]/g, "")
    : q.replace(/\D/g, "");

  const orParts = [`name.ilike.%${safe}%`];
  if (phoneTerm) orParts.push(`phone.ilike.%${phoneTerm}%`);

  const res = await supabase
    .from("workers")
    .select(WORKER_SELECT)
    .or(orParts.join(","))
    .order("created_at", { ascending: false })
    .limit(50);

  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };

  return { ok: true, data: (res.data ?? []).map(mapWorkerView) };
}
