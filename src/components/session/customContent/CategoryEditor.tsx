import { useState } from "react";
import type { AdvancedSessionSettingsValue } from "../../../domain/session/advancedSessionSettings";
import {
  createSessionCustomCategoryId,
  type SessionCustomCategory,
} from "../../../domain/session/sessionCustomContent";

interface CategoryEditorProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

export function CategoryEditor({
  value,
  onChange,
  disabled,
}: CategoryEditorProps) {
  const [categoryDraft, setCategoryDraft] = useState({
    label: "",
    promptNoun: "",
    selectors: "",
  });

  const addCategory = () => {
    const label = categoryDraft.label.trim();
    const promptNoun = categoryDraft.promptNoun.trim();
    const selectors = categoryDraft.selectors
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!label || !promptNoun || selectors.length === 0) {
      return;
    }

    const category: SessionCustomCategory = {
      id: createSessionCustomCategoryId(label),
      label,
      promptNoun,
      overpassSelectors: selectors,
    };

    onChange({
      ...value,
      customCategories: [...value.customCategories, category],
    });
    setCategoryDraft({ label: "", promptNoun: "", selectors: "" });
  };

  return (
    <>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Custom POI categories
      </p>
      <p className="text-xs text-ink-muted">
        Add Overpass tag selectors for Matching, Measuring, and Tentacle (one
        selector per line, e.g. amenity=police).
      </p>
      {value.customCategories.length > 0 ? (
        <ul className="space-y-1 text-sm text-ink">
          {value.customCategories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-2 border border-border px-2 py-1"
            >
              <span>
                {category.label}
                <span className="block text-xs text-ink-muted">
                  {category.overpassSelectors.join(", ")}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    customCategories: value.customCategories.filter(
                      (item) => item.id !== category.id,
                    ),
                  })
                }
                className="text-xs text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="field-label text-xs">
          Label
          <input
            value={categoryDraft.label}
            disabled={disabled}
            onChange={(event) =>
              setCategoryDraft((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
            className="field-input mt-1"
          />
        </label>
        <label className="field-label text-xs">
          Prompt noun
          <input
            value={categoryDraft.promptNoun}
            disabled={disabled}
            onChange={(event) =>
              setCategoryDraft((current) => ({
                ...current,
                promptNoun: event.target.value,
              }))
            }
            placeholder="police station"
            className="field-input mt-1"
          />
        </label>
      </div>
      <label className="field-label text-xs">
        Overpass selectors
        <textarea
          value={categoryDraft.selectors}
          disabled={disabled}
          onChange={(event) =>
            setCategoryDraft((current) => ({
              ...current,
              selectors: event.target.value,
            }))
          }
          rows={3}
          placeholder="[amenity=police]"
          className="field-input mt-1"
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={addCategory}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-blue disabled:opacity-50"
      >
        Add category
      </button>
    </>
  );
}
