"use client";

import { useMemo, useState } from "react";
import type { Category, Subcategory } from "@/types";
import { inputClass } from "./ui";
import { hapticImpact } from "@/lib/telegram";

interface Props {
  categories: Category[];
  subcategories: Subcategory[];
  value: number[];
  onChange: (ids: number[]) => void;
}

export function SubcategoryMultiSelect({ categories, subcategories, value, onChange }: Props) {
  const [query, setQuery] = useState("");

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

  // Filtered + grouped by parent category, for the picker list.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<number, { category: Category; items: Subcategory[] }>();
    for (const s of subcategories) {
      if (value.includes(s.id)) continue; // hide already-selected
      const cat = categoryById.get(s.category_id);
      if (!cat) continue;
      const matches =
        !q ||
        s.name_ru.toLowerCase().includes(q) ||
        cat.name_ru.toLowerCase().includes(q);
      if (!matches) continue;
      if (!groups.has(cat.id)) groups.set(cat.id, { category: cat, items: [] });
      groups.get(cat.id)!.items.push(s);
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.category.sort_order - b.category.sort_order
    );
  }, [subcategories, value, query, categoryById]);

  function add(id: number) {
    if (value.includes(id)) return;
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

      <input
        className={inputClass}
        placeholder="Поиск: «санте», «конди»…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() ? (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-tg-hint/20">
          {grouped.length === 0 ? (
            <div className="px-3 py-4 text-sm text-tg-hint">Ничего не найдено</div>
          ) : (
            grouped.map((g) => (
              <div key={g.category.id}>
                <div className="sticky top-0 bg-tg-secondaryBg px-3 py-1 text-xs font-semibold text-tg-hint">
                  {g.category.name_ru}
                </div>
                {g.items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => add(s.id)}
                    className="block w-full px-3 py-2 text-left text-sm active:bg-tg-secondaryBg"
                  >
                    {s.name_ru}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
