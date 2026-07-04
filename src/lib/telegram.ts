"use client";

// =====================================================================
// Thin client-side wrapper over the Telegram WebApp runtime.
// The official telegram-web-app.js script (loaded in layout) exposes
// window.Telegram.WebApp and also injects the --tg-theme-* CSS variables
// we style against. Typed loosely on purpose — the runtime surface drifts
// across Bot API versions, and we only touch a stable subset.
// =====================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

type AnyWebApp = any;

declare global {
  interface Window {
    Telegram?: { WebApp?: AnyWebApp };
  }
}

export function getWebApp(): AnyWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

/** Raw, signed initData string. Empty string when not opened via Telegram. */
export function getInitDataRaw(): string {
  return getWebApp()?.initData ?? "";
}

/** Tell Telegram the app is ready and expand to full height. */
export function initWebApp(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand?.();
    // Stop Telegram from hijacking vertical drags (swipe-to-close), which
    // otherwise swallows taps/scrolls on our dropdown lists. Bot API 7.7+.
    wa.disableVerticalSwipes?.();
  } catch {
    /* no-op */
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light"): void {
  try {
    getWebApp()?.HapticFeedback?.impactOccurred?.(style);
  } catch {
    /* no-op */
  }
}

export function hapticNotification(type: "success" | "error" | "warning"): void {
  try {
    getWebApp()?.HapticFeedback?.notificationOccurred?.(type);
  } catch {
    /* no-op */
  }
}

/**
 * Ask Telegram to share the user's own contact. Resolves with the phone
 * number when available, or null if the user declined / the runtime did
 * not return one (in that case the admin types the number manually).
 */
export function requestContact(): Promise<string | null> {
  return new Promise((resolve) => {
    const wa = getWebApp();
    if (!wa?.requestContact) {
      resolve(null);
      return;
    }
    try {
      wa.requestContact((granted: boolean, payload: any) => {
        if (!granted) {
          resolve(null);
          return;
        }
        const phone =
          payload?.responseUnsafe?.contact?.phone_number ??
          payload?.response?.contact?.phone_number ??
          payload?.contact?.phone_number ??
          null;
        resolve(typeof phone === "string" ? phone : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const wa = getWebApp();
    if (!wa?.showConfirm) {
      resolve(typeof window !== "undefined" ? window.confirm(message) : false);
      return;
    }
    try {
      wa.showConfirm(message, (ok: boolean) => resolve(Boolean(ok)));
    } catch {
      resolve(false);
    }
  });
}
