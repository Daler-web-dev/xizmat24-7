"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "./_shared";
import type { ActionResult } from "@/types";

export async function deleteWorker(
  initDataRaw: string,
  workerId: string
): Promise<ActionResult<{ id: string }>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  if (!workerId || typeof workerId !== "string") {
    return { ok: false, error: "Не указан специалист", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();

  // worker_subcategories / worker_portfolio / reviews cascade on delete.
  const res = await supabase.from("workers").delete().eq("id", workerId);
  if (res.error) return { ok: false, error: res.error.message, code: "SERVER" };

  return { ok: true, data: { id: workerId } };
}
