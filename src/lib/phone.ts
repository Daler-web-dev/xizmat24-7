import { parsePhoneNumberFromString } from "libphonenumber-js";

// =====================================================================
// Phone normalization/validation. The phone is the FUTURE LOGIN — it must
// be strictly normalized to E.164 (+998XXXXXXXXX) and unique.
// Accepts any reasonable input: +998901234567, 998 90 123 45 67, 90 123 45 67.
// =====================================================================

export interface PhoneResult {
  ok: boolean;
  /** Normalized E.164 number, present only when ok === true. */
  normalized?: string;
  error?: string;
}

export function normalizePhone(input: string): PhoneResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Телефон обязателен." };

  const parsed = parsePhoneNumberFromString(raw, "UZ");
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: "Неверный номер. Пример: +998 90 123 45 67" };
  }

  // Enforce UZ — reject numbers that parsed into another country.
  if (parsed.country !== "UZ") {
    return { ok: false, error: "Только узбекские номера (+998)." };
  }

  return { ok: true, normalized: parsed.number }; // E.164, e.g. +998901234567
}

/** Lightweight client-side hint without the full library guarantee. */
export function looksLikePhone(input: string): boolean {
  return normalizePhone(input).ok;
}
