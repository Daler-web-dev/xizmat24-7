"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { workerInputSchema, type WorkerInput } from "@/lib/schemas";
import { requireAdmin, mapWorkerView, WORKER_SELECT } from "./_shared";
import type { ActionResult, WorkerView } from "@/types";

export interface CreateWorkerResult {
  worker: WorkerView;
  /** true when a worker with this phone already existed (no duplicate created). */
  duplicate: boolean;
}

export async function createWorker(
  initDataRaw: string,
  input: WorkerInput
): Promise<ActionResult<CreateWorkerResult>> {
  // 1. Auth + whitelist.
  const auth = requireAdmin(initDataRaw);
  if (!auth.ok) return { ok: false, error: auth.error, code: auth.code };

  // 2. Validate payload.
  const parsed = workerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Неверные данные", code: "VALIDATION" };
  }
  const data = parsed.data;

  // 3. Normalize + validate phone (the future login).
  const phone = normalizePhone(data.phone);
  if (!phone.ok || !phone.normalized) {
    return { ok: false, error: phone.error ?? "Неверный номер", code: "VALIDATION" };
  }

  const supabase = getSupabaseAdmin();

  // 4. Duplicate check — return the existing worker instead of creating a copy.
  const existing = await supabase
    .from("workers")
    .select(WORKER_SELECT)
    .eq("phone", phone.normalized)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message, code: "SERVER" };
  }
  if (existing.data) {
    return { ok: true, data: { worker: mapWorkerView(existing.data), duplicate: true } };
  }

  // 5. Atomic insert: worker + subcategories via RPC (single transaction).
  const rpc = await supabase.rpc("create_worker_with_subcategories", {
    p_name: data.name.trim(),
    p_phone: phone.normalized,
    p_region_id: data.regionId,
    p_tuman_id: data.tumanId,
    p_rate: data.rate ?? null,
    p_rate_type: data.rateType ?? null,
    p_added_by: auth.user.id,
    p_subcategory_ids: data.subcategoryIds,
  });

  if (rpc.error) {
    // Unique violation on phone (race with a concurrent insert).
    if (rpc.error.code === "23505") {
      const again = await supabase
        .from("workers")
        .select(WORKER_SELECT)
        .eq("phone", phone.normalized)
        .maybeSingle();
      if (again.data) {
        return { ok: true, data: { worker: mapWorkerView(again.data), duplicate: true } };
      }
      return { ok: false, error: "Такой телефон уже есть.", code: "DUPLICATE" };
    }
    return { ok: false, error: rpc.error.message, code: "SERVER" };
  }

  const newId = rpc.data as string;

  // 6. Read back the created worker for the success screen.
  const created = await supabase.from("workers").select(WORKER_SELECT).eq("id", newId).single();
  if (created.error) {
    return { ok: false, error: created.error.message, code: "SERVER" };
  }

  return { ok: true, data: { worker: mapWorkerView(created.data), duplicate: false } };
}
