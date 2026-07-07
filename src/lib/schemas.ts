import { z } from "zod";

// =====================================================================
// One zod schema shared by client and server actions.
// Mini App only collects the seeding minimum (see spec §1, §6.2).
// =====================================================================

export const rateTypeSchema = z.enum(["day", "task", "hour"]);
export const genderSchema = z.enum(["male", "female"]);

const CURRENT_YEAR = new Date().getFullYear();

// Base object (no refinement) so it can be extended for the update payload.
const workerBaseShape = {
  name: z.string().trim().min(1, "Имя обязательно").max(200),
  // Raw phone input; normalized/validated separately via lib/phone.ts.
  phone: z.string().trim().min(3, "Телефон обязателен"),
  birthYear: z
    .number({ invalid_type_error: "Год рождения — число" })
    .int()
    .min(1930, "Проверьте год рождения")
    .max(CURRENT_YEAR, "Год рождения не может быть в будущем")
    .nullable()
    .optional(),
  gender: genderSchema.nullable().optional(),
  subcategoryIds: z
    .array(z.number().int().positive())
    .min(1, "Выберите хотя бы одну специальность"),
  regionId: z.number({ invalid_type_error: "Выберите регион" }).int().positive("Выберите регион"),
  tumanId: z.number({ invalid_type_error: "Выберите туман" }).int().positive("Выберите туман"),
  rate: z.number().positive("Ставка должна быть больше 0").nullable().optional(),
  rateType: rateTypeSchema.nullable().optional(),
} as const;

// rate and rateType must be provided together or both omitted.
const rateTogether = (v: { rate?: number | null; rateType?: "day" | "task" | "hour" | null }) =>
  (v.rate == null && v.rateType == null) || (v.rate != null && v.rateType != null);
const rateTogetherMsg = {
  message: "Укажите и ставку, и её тип, либо оставьте оба пустыми",
  path: ["rate"],
};

export const workerInputSchema = z.object(workerBaseShape).refine(rateTogether, rateTogetherMsg);

export const workerUpdateSchema = z
  .object({ ...workerBaseShape, id: z.string().uuid() })
  .refine(rateTogether, rateTogetherMsg);

export type WorkerInput = z.infer<typeof workerInputSchema>;
export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>;

// ----- Reference data (regions / tumans) management via the bot -----
// UZ is what the admin types; RU is optional and falls back to UZ in the
// action (name_ru is NOT NULL + the natural key, so it must end up non-empty).

export const regionInputSchema = z.object({
  name_uz: z.string().trim().min(1, "Nomi (UZ) majburiy").max(200),
  name_ru: z.string().trim().max(200).optional().default(""),
});

export const tumanInputSchema = z.object({
  regionId: z.number({ invalid_type_error: "Выберите регион" }).int().positive("Выберите регион"),
  name_uz: z.string().trim().min(1, "Nomi (UZ) majburiy").max(200),
  name_ru: z.string().trim().max(200).optional().default(""),
});

export type RegionInput = z.infer<typeof regionInputSchema>;
export type TumanInput = z.infer<typeof tumanInputSchema>;
