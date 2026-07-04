"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/app/providers";
import { getReferenceData } from "@/actions/getReferenceData";
import { addRegion } from "@/actions/refs/addRegion";
import { listTumans } from "@/actions/refs/listTumans";
import { addTuman } from "@/actions/refs/addTuman";
import { deleteTuman } from "@/actions/refs/deleteTuman";
import type { Region, Tuman } from "@/types";
import { Button, Field, Spinner, StateScreen, inputClass } from "@/components/ui";
import { showConfirm, hapticNotification } from "@/lib/telegram";

export default function RegionsPage() {
  const router = useRouter();
  const { ready, insideTelegram, initDataRaw } = useTelegram();

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [selected, setSelected] = useState<Region | null>(null);
  const [query, setQuery] = useState("");

  // load regions
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
      setRegions(res.data.regions);
    })();
  }, [ready, insideTelegram, initDataRaw]);

  const filteredRegions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...regions].sort((a, b) => a.sort_order - b.sort_order);
    if (!q) return sorted;
    return sorted.filter(
      (r) => r.name_ru.toLowerCase().includes(q) || r.name_uz.toLowerCase().includes(q)
    );
  }, [regions, query]);

  function onRegionAdded(r: Region) {
    setRegions((prev) => [...prev, r]);
    setSelected(r);
  }

  if (!ready || loading) return <Spinner label="Загрузка…" />;
  if (!insideTelegram) return <StateScreen emoji="📱" title="Откройте через Telegram" />;
  if (forbidden)
    return <StateScreen emoji="⛔️" title="Нет доступа" subtitle="Вы не в списке администраторов." />;
  if (error) return <StateScreen emoji="⚠️" title="Ошибка" subtitle={error} />;

  // ----- Region selected: manage its tumans -----
  if (selected) {
    return (
      <TumanManager
        initDataRaw={initDataRaw}
        region={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  // ----- Region list + add region -----
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/")} className="text-tg-link">
          ‹ Назад
        </button>
        <h1 className="text-lg font-semibold">Регионы и туманы</h1>
      </div>

      <p className="text-sm text-tg-hint">
        Выберите город/регион, чтобы добавить или удалить его туманы и районы.
      </p>

      <input
        className={inputClass}
        placeholder="Поиск региона"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filteredRegions.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r)}
            className="flex w-full items-center justify-between rounded-xl bg-tg-secondaryBg p-3 text-left active:opacity-80"
          >
            <span className="font-medium">{r.name_ru}</span>
            <span className="text-sm text-tg-hint">{r.name_uz} ›</span>
          </button>
        ))}
        {filteredRegions.length === 0 ? (
          <p className="py-4 text-center text-sm text-tg-hint">Регион не найден</p>
        ) : null}
      </div>

      <AddRegionForm initDataRaw={initDataRaw} onAdded={onRegionAdded} />
    </div>
  );
}

// =====================================================================

function AddRegionForm({
  initDataRaw,
  onAdded,
}: {
  initDataRaw: string;
  onAdded: (r: Region) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nameRu, setNameRu] = useState("");
  const [nameUz, setNameUz] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await addRegion(initDataRaw, { name_ru: nameRu, name_uz: nameUz });
    setBusy(false);
    if (!res.ok) {
      hapticNotification("error");
      setErr(res.error);
      return;
    }
    hapticNotification("success");
    onAdded(res.data);
    setNameRu("");
    setNameUz("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="secondary" block onClick={() => setOpen(true)}>
        + Добавить город / регион
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-tg-secondaryBg p-4">
      <h2 className="text-sm font-semibold">Новый город / регион</h2>
      <Field label="Название (RU)">
        <input className={inputClass} value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="г. Ташкент" />
      </Field>
      <Field label="Nomi (UZ)">
        <input className={inputClass} value={nameUz} onChange={(e) => setNameUz(e.target.value)} placeholder="Toshkent shahri" />
      </Field>
      {err ? <p className="text-sm text-tg-destructive">{err}</p> : null}
      <div className="flex gap-2">
        <Button variant="secondary" block onClick={() => setOpen(false)} disabled={busy}>
          Отмена
        </Button>
        <Button block onClick={submit} disabled={busy}>
          {busy ? "Сохранение…" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}

// =====================================================================

function TumanManager({
  initDataRaw,
  region,
  onBack,
}: {
  initDataRaw: string;
  region: Region;
  onBack: () => void;
}) {
  const [tumans, setTumans] = useState<Tuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameRu, setNameRu] = useState("");
  const [nameUz, setNameUz] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listTumans(initDataRaw, region.id);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTumans(res.data);
  }, [initDataRaw, region.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    setBusy(true);
    setFormErr(null);
    const res = await addTuman(initDataRaw, {
      regionId: region.id,
      name_ru: nameRu,
      name_uz: nameUz,
    });
    setBusy(false);
    if (!res.ok) {
      hapticNotification("error");
      setFormErr(res.error);
      return;
    }
    hapticNotification("success");
    setTumans((prev) => [...prev, res.data]);
    setNameRu("");
    setNameUz("");
  }

  async function remove(t: Tuman) {
    const ok = await showConfirm(`Удалить «${t.name_ru}»?`);
    if (!ok) return;
    const res = await deleteTuman(initDataRaw, t.id);
    if (!res.ok) {
      hapticNotification("error");
      setError(res.error);
      return;
    }
    hapticNotification("success");
    setTumans((prev) => prev.filter((x) => x.id !== t.id));
    if (res.data.affectedWorkers > 0) {
      setError(`Удалено. У ${res.data.affectedWorkers} спец. сброшен туман.`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-tg-link">
          ‹ Регионы
        </button>
        <h1 className="text-lg font-semibold">{region.name_ru}</h1>
      </div>

      {/* Add tuman */}
      <div className="space-y-3 rounded-xl bg-tg-secondaryBg p-4">
        <h2 className="text-sm font-semibold">Добавить туман / район</h2>
        <Field label="Название (RU)">
          <input className={inputClass} value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Юнусабадский район" />
        </Field>
        <Field label="Nomi (UZ)">
          <input className={inputClass} value={nameUz} onChange={(e) => setNameUz(e.target.value)} placeholder="Yunusobod tumani" />
        </Field>
        {formErr ? <p className="text-sm text-tg-destructive">{formErr}</p> : null}
        <Button block onClick={add} disabled={busy}>
          {busy ? "Сохранение…" : "Добавить туман"}
        </Button>
      </div>

      {error ? <p className="text-sm text-tg-destructive">{error}</p> : null}

      {/* Tuman list */}
      {loading ? (
        <Spinner />
      ) : tumans.length === 0 ? (
        <p className="py-6 text-center text-sm text-tg-hint">
          В этом регионе пока нет туманов. Добавьте первый.
        </p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-tg-hint">
            Туманы ({tumans.length})
          </h2>
          {tumans.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-tg-secondaryBg p-3"
            >
              <div>
                <div className="font-medium">{t.name_ru}</div>
                <div className="text-xs text-tg-hint">{t.name_uz}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(t)}
                className="shrink-0 text-sm text-tg-destructive"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
