// Shared types for the XIZMAT24 admin Mini App.

export type RateType = "day" | "task" | "hour";
export type WorkerStatus = "seeded" | "active";
export type Gender = "male" | "female";

export interface Region {
  id: number;
  name_ru: string;
  name_uz: string;
  sort_order: number;
}

export interface Tuman {
  id: number;
  region_id: number;
  name_ru: string;
  name_uz: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name_ru: string;
  name_uz: string | null;
  sort_order: number;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name_ru: string;
  name_uz: string | null;
  sort_order: number;
}

/** Subcategory enriched with its parent category name (for grouping in UI). */
export interface SubcategoryWithCategory extends Subcategory {
  category_name: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  birth_year: number | null;
  gender: Gender | null;
  region_id: number | null;
  tuman_id: number | null;
  rate: number | null;
  rate_type: RateType | null;
  added_by: number;
  status: WorkerStatus;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  bio: string | null;
  experience: string | null;
  language: string | null;
  rating: number | null;
  priority: number | null;
}

/** Worker joined with reference labels + its subcategory ids — for list/card views. */
export interface WorkerView extends Worker {
  region_name: string | null;
  tuman_name: string | null;
  subcategory_ids: number[];
  subcategory_names: string[];
}

/** The Telegram user extracted from validated initData. */
export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Uniform result shape returned by server actions. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "DUPLICATE" | "SERVER" };
