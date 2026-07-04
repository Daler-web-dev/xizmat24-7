"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTelegram } from "./providers";
import { listWorkers } from "@/actions/listWorkers";
import { searchWorkers } from "@/actions/searchWorkers";
import type { WorkerView } from "@/types";
import { Button, Spinner, StateScreen, inputClass } from "@/components/ui";
import { WorkerListItem } from "@/components/WorkerCard";

export default function HomePage() {
  const { ready, insideTelegram, initDataRaw } = useTelegram();
  const [workers, setWorkers] = useState<WorkerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      const res = q.trim()
        ? await searchWorkers(initDataRaw, q)
        : await listWorkers(initDataRaw, 10);
      setLoading(false);
      if (!res.ok) {
        if (res.code === "FORBIDDEN") setForbidden(true);
        else setError(res.error);
        return;
      }
      setWorkers(res.data);
    },
    [initDataRaw]
  );

  useEffect(() => {
    if (!ready) return;
    if (!insideTelegram) {
      setLoading(false);
      return;
    }
    void load("");
  }, [ready, insideTelegram, load]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(value), 350);
  }

  if (!ready) return <Spinner label="Загрузка…" />;

  if (!insideTelegram) {
    return (
      <StateScreen
        emoji="📱"
        title="Откройте через Telegram"
        subtitle="Это приложение работает только внутри Telegram — по кнопке меню бота XIZMAT24."
      />
    );
  }

  if (forbidden) {
    return (
      <StateScreen
        emoji="⛔️"
        title="Нет доступа"
        subtitle="Ваш Telegram ID не в списке администраторов. Обратитесь к владельцу платформы."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">XIZMAT24</h1>
        <div className="flex gap-2">
          <Link href="/regions">
            <Button variant="secondary">Регионы</Button>
          </Link>
          <Link href="/add">
            <Button>+ Добавить</Button>
          </Link>
        </div>
      </div>

      <input
        className={inputClass}
        placeholder="Поиск по имени или телефону"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-sm text-tg-destructive">{error}</p>
      ) : workers.length === 0 ? (
        <p className="py-8 text-center text-sm text-tg-hint">
          {query.trim() ? "Ничего не найдено" : "Пока никого нет. Добавьте первого специалиста."}
        </p>
      ) : (
        <div className="space-y-2">
          {!query.trim() ? (
            <h2 className="text-sm font-semibold text-tg-hint">Последние добавленные</h2>
          ) : null}
          {workers.map((w) => (
            <WorkerListItem key={w.id} worker={w} />
          ))}
        </div>
      )}
    </div>
  );
}
