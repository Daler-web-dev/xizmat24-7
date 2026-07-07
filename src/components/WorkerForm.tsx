"use client";

import { useMemo, useState } from "react";
import type { ReferenceData } from "@/actions/getReferenceData";
import { workerInputSchema, type WorkerInput } from "@/lib/schemas";
import { normalizePhone, formatUzPhone } from "@/lib/phone";
import type { ActionResult, RateType, WorkerView } from "@/types";
import { Button, Field, inputClass } from "./ui";
import { SubcategoryMultiSelect } from "./SubcategoryMultiSelect";
import { RegionTumanCascade } from "./RegionTumanCascade";
import { requestContact, hapticNotification } from "@/lib/telegram";

const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: "day", label: "День" },
  { value: "task", label: "Задача" },
  { value: "hour", label: "Час" },
];

interface Props {
  refs: ReferenceData;
  /** Prefill for edit mode. */
  initial?: WorkerView;
  submitLabel: string;
  onSubmit: (input: WorkerInput) => Promise<ActionResult<unknown>>;
  /** Called after a successful submit. */
  onDone: (result: unknown) => void;
}

export function WorkerForm({ refs, initial, submitLabel, onSubmit, onDone }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(formatUzPhone(initial?.phone ?? ""));
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>(initial?.subcategory_ids ?? []);
  const [regionId, setRegionId] = useState<number | null>(initial?.region_id ?? null);
  const [tumanId, setTumanId] = useState<number | null>(initial?.tuman_id ?? null);
  const [rate, setRate] = useState<string>(initial?.rate != null ? String(initial.rate) : "");
  const [rateType, setRateType] = useState<RateType | null>(initial?.rate_type ?? null);

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function buildInput(): WorkerInput {
    return {
      name: name.trim(),
      phone: phone.trim(),
      subcategoryIds,
      regionId: regionId ?? 0,
      tumanId: tumanId ?? 0,
      rate: rate.trim() ? Number(rate) : null,
      rateType: rate.trim() ? rateType : null,
    };
  }

  function validateLocally(): WorkerInput | null {
    setError(null);
    const candidate = buildInput();
    const parsed = workerInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return null;
    }
    const ph = normalizePhone(candidate.phone);
    if (!ph.ok) {
      setError(ph.error ?? "Неверный номер");
      return null;
    }
    return parsed.data;
  }

  function goConfirm() {
    const ok = validateLocally();
    if (ok) setConfirming(true);
  }

  async function takeContact() {
    const num = await requestContact();
    if (num) setPhone(formatUzPhone(num));
  }

  async function doSubmit() {
    const input = validateLocally();
    if (!input) {
      setConfirming(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(input);
    setSubmitting(false);
    if (!res.ok) {
      hapticNotification("error");
      setError(res.error);
      setConfirming(false);
      return;
    }
    hapticNotification("success");
    onDone(res.data);
  }

  // Labels for the confirmation summary.
  const summary = useMemo(() => {
    const subNames = subcategoryIds
      .map((id) => refs.subcategories.find((s) => s.id === id)?.name_ru)
      .filter(Boolean) as string[];
    const regionName = refs.regions.find((r) => r.id === regionId)?.name_ru ?? "—";
    const tumanName = refs.tumans.find((t) => t.id === tumanId)?.name_ru ?? "—";
    const phonePreview = normalizePhone(phone).normalized ?? phone;
    const rateLabel =
      rate.trim() && rateType
        ? `${rate} / ${RATE_TYPES.find((r) => r.value === rateType)?.label}`
        : "—";
    return { subNames, regionName, tumanName, phonePreview, rateLabel };
  }, [subcategoryIds, regionId, tumanId, phone, rate, rateType, refs]);

  if (confirming) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Проверьте данные</h2>
        <div className="space-y-2 rounded-xl bg-tg-secondaryBg p-4 text-sm">
          <Row label="Имя" value={name.trim()} />
          <Row label="Телефон" value={summary.phonePreview} />
          <Row label="Специальности" value={summary.subNames.join(", ")} />
          <Row label="Регион" value={summary.regionName} />
          <Row label="Туман" value={summary.tumanName} />
          <Row label="Ставка" value={summary.rateLabel} />
        </div>
        {error ? <p className="text-sm text-tg-destructive">{error}</p> : null}
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirming(false)} disabled={submitting}>
            Назад
          </Button>
          <Button block onClick={doSubmit} disabled={submitting}>
            {submitting ? "Сохранение…" : "Подтвердить"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Имя">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя специалиста"
        />
      </Field>

      <Field label="Телефон" hint="Будущий логин. Формат +998XXXXXXXXX.">
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(formatUzPhone(e.target.value))}
            onFocus={() => {
              if (!phone) setPhone("+998");
            }}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
          />
          <Button type="button" variant="secondary" onClick={takeContact} className="shrink-0">
            Мой контакт
          </Button>
        </div>
      </Field>

      <Field label="Специальности" hint="Минимум одна. Можно несколько.">
        <SubcategoryMultiSelect
          categories={refs.categories}
          subcategories={refs.subcategories}
          value={subcategoryIds}
          onChange={setSubcategoryIds}
        />
      </Field>

      <RegionTumanCascade
        regions={refs.regions}
        tumans={refs.tumans}
        regionId={regionId}
        tumanId={tumanId}
        onRegionChange={(id) => {
          setRegionId(id);
          setTumanId(null); // cascade reset
        }}
        onTumanChange={setTumanId}
      />

      <Field label="Ставка" hint="Опционально. Укажите сумму и тип.">
        <div className="space-y-2">
          <input
            className={inputClass}
            value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Например, 200000"
            inputMode="numeric"
          />
          <div className="flex gap-2">
            {RATE_TYPES.map((rt) => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRateType(rateType === rt.value ? null : rt.value)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                  rateType === rt.value
                    ? "bg-tg-button text-tg-buttonText"
                    : "bg-tg-secondaryBg text-tg-text"
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>
      </Field>

      {error ? <p className="text-sm text-tg-destructive">{error}</p> : null}

      <Button block onClick={goConfirm}>
        {submitLabel}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-tg-hint">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
