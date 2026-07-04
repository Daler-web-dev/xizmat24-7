"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getInitDataRaw, initWebApp } from "@/lib/telegram";

interface TelegramContextValue {
  /** Raw signed initData to attach to every server action call. */
  initDataRaw: string;
  /** True once we've checked the runtime (avoids flashing the "open in Telegram" screen). */
  ready: boolean;
  /** True when running inside Telegram with a non-empty initData. */
  insideTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
  initDataRaw: "",
  ready: false,
  insideTelegram: false,
});

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [initDataRaw, setInitDataRaw] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWebApp();
    setInitDataRaw(getInitDataRaw());
    setReady(true);
  }, []);

  return (
    <TelegramContext.Provider
      value={{ initDataRaw, ready, insideTelegram: initDataRaw.length > 0 }}
    >
      {children}
    </TelegramContext.Provider>
  );
}
