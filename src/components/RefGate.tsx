"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTelegram } from "@/app/providers";
import { getReferenceData, type ReferenceData } from "@/actions/getReferenceData";
import { Spinner, StateScreen } from "./ui";

/**
 * Loads catalog data and gates auth states. Renders children with the
 * reference data + initDataRaw once everything is ready.
 */
export function RefGate({
  children,
}: {
  children: (ctx: { refs: ReferenceData; initDataRaw: string }) => ReactNode;
}) {
  const { ready, insideTelegram, initDataRaw } = useTelegram();
  const [refs, setRefs] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!insideTelegram) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await getReferenceData(initDataRaw);
      setLoading(false);
      if (!res.ok) {
        if (res.code === "FORBIDDEN") setForbidden(true);
        else setError(res.error);
        return;
      }
      setRefs(res.data);
    })();
  }, [ready, insideTelegram, initDataRaw]);

  if (!ready || loading) return <Spinner label="Загрузка…" />;
  if (!insideTelegram)
    return <StateScreen emoji="📱" title="Откройте через Telegram" />;
  if (forbidden)
    return (
      <StateScreen
        emoji="⛔️"
        title="Нет доступа"
        subtitle="Ваш Telegram ID не в списке администраторов."
      />
    );
  if (error) return <StateScreen emoji="⚠️" title="Ошибка" subtitle={error} />;
  if (!refs) return <Spinner />;

  return <>{children({ refs, initDataRaw })}</>;
}
