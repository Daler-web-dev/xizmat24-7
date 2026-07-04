import "server-only";

import { validateInitData, type AuthResult } from "@/lib/auth/validateInitData";
import type { WorkerView } from "@/types";

// Select string that pulls a worker plus reference labels and its subcategories.
export const WORKER_SELECT = `
  *,
  region:regions(name_ru),
  tuman:tumans(name_ru),
  worker_subcategories(
    subcategory_id,
    subcategories(name_ru)
  )
` as const;

/** Shape returned by Supabase for the WORKER_SELECT join (loosely typed). */
type WorkerRow = Record<string, unknown> & {
  region?: { name_ru: string } | null;
  tuman?: { name_ru: string } | null;
  worker_subcategories?: Array<{
    subcategory_id: number;
    subcategories?: { name_ru: string } | null;
  }> | null;
};

/** Map a joined Supabase row into a flat WorkerView. */
export function mapWorkerView(row: WorkerRow): WorkerView {
  const subs = row.worker_subcategories ?? [];
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    region_id: (row.region_id as number | null) ?? null,
    tuman_id: (row.tuman_id as number | null) ?? null,
    rate: (row.rate as number | null) ?? null,
    rate_type: (row.rate_type as WorkerView["rate_type"]) ?? null,
    added_by: row.added_by as number,
    status: row.status as WorkerView["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    experience: (row.experience as string | null) ?? null,
    language: (row.language as string | null) ?? null,
    rating: (row.rating as number | null) ?? null,
    priority: (row.priority as number | null) ?? null,
    region_name: row.region?.name_ru ?? null,
    tuman_name: row.tuman?.name_ru ?? null,
    subcategory_ids: subs.map((s) => s.subcategory_id),
    subcategory_names: subs.map((s) => s.subcategories?.name_ru ?? "").filter(Boolean),
  };
}

/** Auth gate reused by every server action. */
export function requireAdmin(initDataRaw: string | null | undefined): AuthResult {
  return validateInitData(initDataRaw);
}
