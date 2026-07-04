"use client";

import { useMemo, useState } from "react";
import type { Region, Tuman } from "@/types";
import { inputClass } from "./ui";

interface Option {
  id: number;
  label: string;
}

function SearchableSelect({
  placeholder,
  options,
  value,
  onChange,
  disabled,
  emptyText,
}: {
  placeholder: string;
  options: Option[];
  value: number | null;
  onChange: (id: number) => void;
  disabled?: boolean;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  if (selected && !open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          setQuery("");
        }}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span>{selected.label}</span>
        <span className="text-tg-hint">▾</span>
      </button>
    );
  }

  return (
    <div>
      <input
        className={inputClass}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-tg-hint/20">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-tg-hint">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                // pointerdown (not click): registers the tap before the
                // input blur / keyboard dismissal can swallow it in Telegram.
                onPointerDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm active:bg-tg-secondaryBg"
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  regions: Region[];
  tumans: Tuman[];
  regionId: number | null;
  tumanId: number | null;
  onRegionChange: (id: number) => void;
  onTumanChange: (id: number) => void;
}

export function RegionTumanCascade({
  regions,
  tumans,
  regionId,
  tumanId,
  onRegionChange,
  onTumanChange,
}: Props) {
  const regionOptions: Option[] = useMemo(
    () =>
      [...regions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ id: r.id, label: r.name_ru })),
    [regions]
  );

  const tumanOptions: Option[] = useMemo(
    () =>
      tumans
        .filter((t) => t.region_id === regionId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({ id: t.id, label: t.name_ru })),
    [tumans, regionId]
  );

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-sm font-medium">Регион</span>
        <SearchableSelect
          placeholder="Выберите регион"
          options={regionOptions}
          value={regionId}
          emptyText="Регион не найден"
          onChange={(id) => {
            onRegionChange(id); // parent resets tuman on region change
          }}
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Туман / район</span>
        <SearchableSelect
          placeholder={regionId ? "Выберите туман" : "Сначала выберите регион"}
          options={tumanOptions}
          value={tumanId}
          disabled={!regionId}
          emptyText={regionId ? "Туман не найден (проверьте справочник)" : "Сначала регион"}
          onChange={onTumanChange}
        />
      </div>
    </div>
  );
}
