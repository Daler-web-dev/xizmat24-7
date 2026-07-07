"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { workerUpdateSchema, type WorkerUpdateInput } from "@/lib/schemas";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

export async function updateWorker(
  initDataRaw: string,
  input: WorkerUpdateInput
): Promise<ActionResult<WorkerView>> {
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  const parsed = workerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Неверные данные", code: "VALIDATION" };
  }
  const data = parsed.data;

  const phone = normalizePhone(data.phone);
  if (!phone.ok || !phone.normalized) {
    return { ok: false, error: phone.error ?? "Неверный номер", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();

  // Reject if the normalized phone belongs to a *different* worker.
  const clash = await supabase
    .from("workers")
    .select("id")
    .eq("phone", phone.normalized)
    .neq("id", data.id)
    .maybeSingle();
  if (clash.error) return { ok: false, error: clash.error.message, code: "SERVER" };
  if (clash.data) {
    return { ok: false, error: "Этот телефон уже у другого специалиста.", code: "DUPLICATE" };
  }

  const rpc = await supabase.rpc("update_worker_with_subcategories", {
    p_id: data.id,
    p_name: data.name.trim(),
    p_phone: phone.normalized,
    p_region_id: data.regionId,
    p_tuman_id: data.tumanId,
    p_rate: data.rate ?? null,
    p_rate_type: data.rateType ?? null,
    p_subcategory_ids: data.subcategoryIds,
    p_birth_year: data.birthYear ?? null,
    p_gender: data.gender ?? null,
  });

  if (rpc.error) {
    if (rpc.error.code === "23505") {
      return { ok: false, error: "Этот телефон уже у другого специалиста.", code: "DUPLICATE" };
    }
    return { ok: false, error: rpc.error.message, code: "SERVER" };
  }

  const updated = await supabase.from("workers").select(WORKER_SELECT).eq("id", data.id).single();
  if (updated.error) return { ok: false, error: updated.error.message, code: "SERVER" };

  return { ok: true, data: mapWorkerView(updated.data) };
}
