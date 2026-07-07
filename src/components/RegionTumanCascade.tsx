"use client";

import { useMemo } from "react";
import type { Region, Tuman } from "@/types";
import { Field, Select } from "./ui";

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
  const regionOptions = useMemo(
    () => [...regions].sort((a, b) => a.sort_order - b.sort_order),
    [regions]
  );

  const tumanOptions = useMemo(
    () =>
      tumans
        .filter((t) => t.region_id === regionId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [tumans, regionId]
  );

  return (
    <div className="space-y-3">
      <Field label="Регион">
        <Select
          value={regionId ? String(regionId) : ""}
          empty={!regionId}
          onChange={(e) => onRegionChange(Number(e.target.value))}
        >
          <option value="" disabled>
            Выберите регион
          </option>
          {regionOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name_ru}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Туман / район">
        <Select
          value={tumanId ? String(tumanId) : ""}
          empty={!tumanId}
          disabled={!regionId}
          onChange={(e) => onTumanChange(Number(e.target.value))}
        >
          <option value="" disabled>
            {regionId ? "Выберите туман" : "Сначала выберите регион"}
          </option>
          {tumanOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name_ru}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
