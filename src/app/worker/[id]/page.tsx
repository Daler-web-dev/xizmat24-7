"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTelegram } from "@/app/providers";
import { getWorker } from "@/actions/getWorker";
import { updateWorker } from "@/actions/updateWorker";
import { deleteWorker } from "@/actions/deleteWorker";
import type { WorkerView } from "@/types";
import type { WorkerInput } from "@/lib/schemas";
import { WorkerCard } from "@/components/WorkerCard";
import { WorkerForm } from "@/components/WorkerForm";
import { RefGate } from "@/components/RefGate";
import { Button, Spinner, StateScreen } from "@/components/ui";
import { showConfirm, hapticNotification } from "@/lib/telegram";

export default function WorkerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { ready, insideTelegram, initDataRaw } = useTelegram();

  const [worker, setWorker] = useState<WorkerView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const res = await getWorker(initDataRaw, id);
    setLoading(false);
    if (!res.ok) {
      if (res.code === "FORBIDDEN") setForbidden(true);
      else setError(res.error);
      return;
    }
    setWorker(res.data);
  }, [id, initDataRaw]);

  useEffect(() => {
    if (!ready) return;
    if (!insideTelegram) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, insideTelegram, load]);

  async function onDelete() {
    if (!worker) return;
    const ok = await showConfirm(`Удалить «${worker.name}»? Это действие необратимо.`);
    if (!ok) return;
    setDeleting(true);
    const res = await deleteWorker(initDataRaw, worker.id);
    setDeleting(false);
    if (!res.ok) {
      hapticNotification("error");
      setError(res.error);
      return;
    }
    hapticNotification("success");
    router.push("/");
  }

  if (!ready || loading) return <Spinner label="Загрузка…" />;
  if (!insideTelegram) return <StateScreen emoji="📱" title="Откройте через Telegram" />;
  if (forbidden)
    return <StateScreen emoji="⛔️" title="Нет доступа" subtitle="Вы не в списке администраторов." />;
  if (error && !worker)
    return (
      <StateScreen
        emoji="⚠️"
        title="Не удалось загрузить"
        subtitle={error}
        action={
          <Button onClick={() => router.push("/")} variant="secondary">
            На главную
          </Button>
        }
      />
    );
  if (!worker) return <StateScreen emoji="🔍" title="Специалист не найден" />;

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(false)} className="text-tg-link">
            ‹ Отмена
          </button>
          <h1 className="text-lg font-semibold">Редактирование</h1>
        </div>
        <RefGate>
          {({ refs }) => (
            <WorkerForm
              refs={refs}
              initial={worker}
              submitLabel="Сохранить изменения"
              onSubmit={(input: WorkerInput) =>
                updateWorker(initDataRaw, { ...input, id: worker.id })
              }
              onDone={(result) => {
                setWorker(result as WorkerView);
                setEditing(false);
              }}
            />
          )}
        </RefGate>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/")} className="text-tg-link">
          ‹ Назад
        </button>
      </div>

      <WorkerCard worker={worker} />

      {error ? <p className="text-sm text-tg-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button block onClick={() => setEditing(true)}>
          Редактировать
        </Button>
        <Button variant="destructive" block onClick={onDelete} disabled={deleting}>
          {deleting ? "Удаление…" : "Удалить"}
        </Button>
      </div>
    </div>
  );
}
