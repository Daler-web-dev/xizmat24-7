"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefGate } from "@/components/RefGate";
import { WorkerForm } from "@/components/WorkerForm";
import { createWorker, type CreateWorkerResult } from "@/actions/createWorker";
import { Button, StateScreen } from "@/components/ui";
import type { WorkerInput } from "@/lib/schemas";

export default function AddPage() {
  const router = useRouter();
  const [done, setDone] = useState<CreateWorkerResult | null>(null);

  if (done) {
    return (
      <StateScreen
        emoji={done.duplicate ? "ℹ️" : "✅"}
        title={done.duplicate ? "Уже есть в базе" : "Сохранён"}
        subtitle={
          done.duplicate
            ? `Специалист с таким телефоном уже добавлен: ${done.worker.name}.`
            : `${done.worker.name} добавлен на платформу.`
        }
        action={
          <div className="flex flex-col gap-2">
            <Link href={`/worker/${done.worker.id}`}>
              <Button block>Открыть карточку</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" block>
                На главную
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-tg-link">
          ‹ Назад
        </button>
        <h1 className="text-lg font-semibold">Новый специалист</h1>
      </div>

      <RefGate>
        {({ refs, initDataRaw }) => (
          <WorkerForm
            refs={refs}
            submitLabel="Далее"
            onSubmit={(input: WorkerInput) => createWorker(initDataRaw, input)}
            onDone={(result) => setDone(result as CreateWorkerResult)}
          />
        )}
      </RefGate>
    </div>
  );
}
