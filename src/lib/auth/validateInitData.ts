import "server-only";

import crypto from "node:crypto";
import type { TelegramUser } from "@/types";

// =====================================================================
// Telegram Mini App initData validation.
//
// Standard algorithm (https://core.telegram.org/bots/webapps#validating-data):
//   secret_key      = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN)
//   data_check_str  = sorted "key=value" lines (excluding "hash"), joined by "\n"
//   computed_hash   = HMAC_SHA256(key=secret_key, data=data_check_str)
//   valid  <=>  computed_hash === provided hash
//
// Never trust user.id coming from the client without this check.
// =====================================================================

export type AuthError = "UNAUTHORIZED" | "FORBIDDEN";

export type AuthResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; code: AuthError; error: string };

function getMaxAgeSeconds(): number {
  const raw = process.env.INITDATA_MAX_AGE_SECONDS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
}

function getAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  return new Set(ids);
}

/**
 * Validate the raw initData string and enforce the admin whitelist.
 * Returns the verified Telegram user, or an error with the proper code.
 */
export function validateInitData(initDataRaw: string | null | undefined): AuthResult {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return { ok: false, code: "UNAUTHORIZED", error: "Server misconfigured: BOT_TOKEN missing." };
  }
  if (!initDataRaw || typeof initDataRaw !== "string") {
    return { ok: false, code: "UNAUTHORIZED", error: "Missing initData. Open the app through Telegram." };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initDataRaw);
  } catch {
    return { ok: false, code: "UNAUTHORIZED", error: "Malformed initData." };
  }

  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, code: "UNAUTHORIZED", error: "initData has no hash." };
  }

  // Build the data-check-string: all fields except hash, sorted, "key=value" joined by \n.
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Constant-time comparison.
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: "UNAUTHORIZED", error: "Invalid initData signature." };
  }

  // Freshness check.
  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number.parseInt(authDateRaw, 10) : NaN;
  if (!Number.isFinite(authDate)) {
    return { ok: false, code: "UNAUTHORIZED", error: "initData has no auth_date." };
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > getMaxAgeSeconds()) {
    return { ok: false, code: "UNAUTHORIZED", error: "initData expired. Reopen the app." };
  }

  // Parse the user.
  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, code: "UNAUTHORIZED", error: "initData has no user." };
  }
  let user: TelegramUser;
  try {
    const parsed = JSON.parse(userRaw);
    if (typeof parsed?.id !== "number") {
      return { ok: false, code: "UNAUTHORIZED", error: "initData user has no id." };
    }
    user = {
      id: parsed.id,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      username: parsed.username,
    };
  } catch {
    return { ok: false, code: "UNAUTHORIZED", error: "Malformed user in initData." };
  }

  // Whitelist enforcement.
  const admins = getAdminIds();
  if (!admins.has(user.id)) {
    return { ok: false, code: "FORBIDDEN", error: "Not authorized. Your Telegram ID is not whitelisted." };
  }

  return { ok: true, user };
}
