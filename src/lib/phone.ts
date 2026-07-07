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

/**
 * Progressive input mask for UZ numbers. Always keeps the +998 prefix and
 * formats the 9 national digits as "+998 90 123 45 67". Safe on every
 * keystroke (append & backspace) — the prefix can't be deleted.
 */
export function formatUzPhone(input: string): string {
  let digits = (input ?? "").replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9); // national part, max 9

  let out = "+998";
  if (digits.length > 0) out += " " + digits.slice(0, 2);
  if (digits.length > 2) out += " " + digits.slice(2, 5);
  if (digits.length > 5) out += " " + digits.slice(5, 7);
  if (digits.length > 7) out += " " + digits.slice(7, 9);
  return out;
}
