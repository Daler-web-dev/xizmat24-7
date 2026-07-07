"use client";

import { useMemo } from "react";
import type { Category, Subcategory } from "@/types";
import { Select } from "./ui";
import { hapticImpact } from "@/lib/telegram";

interface Props {
  categories: Category[];
  subcategories: Subcategory[];
  value: number[];
  onChange: (ids: number[]) => void;
}

export function SubcategoryMultiSelect({ categories, subcategories, value, onChange }: Props) {
  const categoryById = useMemo(() => {
    const m = new Map<number, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const subById = useMemo(() => {
    const m = new Map<number, Subcategory>();
    for (const s of subcategories) m.set(s.id, s);
    return m;
  }, [subcategories]);

  // Subcategories grouped under their parent category, for the picker.
  const grouped = useMemo(() => {
    const groups = new Map<number, { category: Category; items: Subcategory[] }>();
    for (const s of subcategories) {
      const cat = categoryById.get(s.category_id);
      if (!cat) continue;
      if (!groups.has(cat.id)) groups.set(cat.id, { category: cat, items: [] });
      groups.get(cat.id)!.items.push(s);
    }
    const arr = Array.from(groups.values()).sort(
      (a, b) => a.category.sort_order - b.category.sort_order
    );
    for (const g of arr) g.items.sort((a, b) => a.sort_order - b.sort_order);
    return arr;
  }, [subcategories, categoryById]);

  function add(id: number) {
    if (!id || value.includes(id)) return;
    hapticImpact("light");
    onChange([...value, id]);
  }
  function remove(id: number) {
    hapticImpact("light");
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div>
      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((id) => {
            const s = subById.get(id);
            if (!s) return null;
            const cat = categoryById.get(s.category_id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-tg-button/15 px-3 py-1 text-xs"
              >
                <span className="text-tg-hint">{cat?.name_ru}:</span>
                <span className="font-medium">{s.name_ru}</span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="ml-1 text-tg-hint"
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Native picker: pick one, it becomes a chip, select resets. Already
          selected items are disabled so they can't be added twice. */}
      <Select value="" empty onChange={(e) => add(Number(e.target.value))}>
        <option value="" disabled>
          + Добавить специальность…
        </option>
        {grouped.map((g) => (
          <optgroup key={g.category.id} label={g.category.name_ru}>
            {g.items.map((s) => (
              <option key={s.id} value={s.id} disabled={value.includes(s.id)}>
                {s.name_ru}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}
