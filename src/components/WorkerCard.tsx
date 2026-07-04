"use client";

import Link from "next/link";
import type { WorkerView } from "@/types";

const RATE_TYPE_LABEL: Record<string, string> = {
  day: "день",
  task: "задача",
  hour: "час",
};

/** Compact row for the home list. */
export function WorkerListItem({ worker }: { worker: WorkerView }) {
  const place = [worker.region_name, worker.tuman_name].filter(Boolean).join(", ");
  return (
    <Link
      href={`/worker/${worker.id}`}
      className="block rounded-xl bg-tg-secondaryBg p-3 active:opacity-80"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{worker.name}</span>
        <span className="shrink-0 text-sm text-tg-hint">{worker.phone}</span>
      </div>
      {worker.subcategory_names.length > 0 ? (
        <div className="mt-1 truncate text-sm text-tg-link">
          {worker.subcategory_names.join(", ")}
        </div>
      ) : null}
      {place ? <div className="mt-0.5 text-xs text-tg-hint">{place}</div> : null}
    </Link>
  );
}

/** Full detail card. */
export function WorkerCard({ worker }: { worker: WorkerView }) {
  const place = [worker.region_name, worker.tuman_name].filter(Boolean).join(", ");
  const rate =
    worker.rate != null
      ? `${worker.rate}${worker.rate_type ? ` / ${RATE_TYPE_LABEL[worker.rate_type]}` : ""}`
      : "—";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{worker.name}</h1>
        <a href={`tel:${worker.phone}`} className="text-tg-link">
          {worker.phone}
        </a>
      </div>

      <div className="space-y-2 rounded-xl bg-tg-secondaryBg p-4 text-sm">
        <Row label="Специальности" value={worker.subcategory_names.join(", ") || "—"} />
        <Row label="Регион" value={worker.region_name ?? "—"} />
        <Row label="Туман" value={worker.tuman_name ?? "—"} />
        <Row label="Ставка" value={rate} />
        <Row label="Статус" value={worker.status} />
      </div>

      <p className="text-xs text-tg-hint">
        {place ? `${place} · ` : ""}добавлен {new Date(worker.created_at).toLocaleDateString("ru-RU")}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-tg-hint">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
