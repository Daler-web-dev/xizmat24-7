"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

/** Fetch a single worker (for the card / edit form). */
export async function getWorker(
  initDataRaw: string,
  workerId: string
): Promise<ActionResult<WorkerView>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  if (!workerId) return { ok: false, error: "Не указан специалист", code: "VALIDATION" };

  const supabase = getSupabaseAdmin();
  const res = await supabase.from("workers").select(WORKER_SELECT).eq("id", workerId).maybeSingle();

  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };
  if (!res.data) return { ok: false, error: "Специалист не найден", code: "VALIDATION" };

  return { ok: true, data: mapWorkerView(res.data) };
}
