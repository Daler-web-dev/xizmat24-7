"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

/** Latest added workers (default 10) for the home screen. */
export async function listWorkers(
  initDataRaw: string,
  limit = 10
): Promise<ActionResult<WorkerView[]>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("workers")
    .select(WORKER_SELECT)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };

  return { ok: true, data: (res.data ?? []).map(mapWorkerView) };
}
