import {
  POI_PIN_CATEGORIES,
  type PoiPinCategoryId,
  parsePoiPinCategory,
} from "../../domain/map/poiPinCategories";
import { SimpleSelectField } from "../ui/forms/GroupedSelectField";
import { TextAreaField } from "../ui/forms/TextAreaField";

const JUST_A_MARKER = "none";

const POI_CATEGORY_OPTIONS = [
  { value: JUST_A_MARKER, label: "Just a marker" },
  ...POI_PIN_CATEGORIES.map(({ id, label }) => ({ value: id, label })),
];

interface PinPanelProps {
  label: string;
  onLabelChange: (value: string) => void;
  poiCategory: PoiPinCategoryId | null;
  onPoiCategoryChange: (value: PoiPinCategoryId | null) => void;
  onCommit: () => void;
  hasPoint: boolean;
  isSubmitting?: boolean;
  labelMaxLength?: number;
}

export function PinPanel({
  label,
  onLabelChange,
  poiCategory,
  onPoiCategoryChange,
  onCommit,
  hasPoint,
  isSubmitting = false,
  labelMaxLength,
}: PinPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-snug text-ink-muted">
        Tap the map to place a note for matching or measuring questions.
      </p>
      {hasPoint ? (
        <p className="text-xs text-ink-dim">Location pinned on the map. Tap again to move it.</p>
      ) : null}
      <TextAreaField
        label="Label"
        labelClassName="block text-sm text-ink-muted"
        inputClassName="mt-1 min-h-20 w-full rounded-xl border border-border bg-surface-base px-3 py-2 text-sm"
        value={label}
        onChange={(event) => onLabelChange(event.target.value)}
        maxLength={labelMaxLength}
        placeholder="Closer to the train station than us"
      />
      <SimpleSelectField
        label="Counts as"
        value={poiCategory ?? JUST_A_MARKER}
        placeholder="Counts as"
        options={POI_CATEGORY_OPTIONS}
        onChange={(value) => onPoiCategoryChange(parsePoiPinCategory(value) ?? null)}
      />
      {poiCategory ? (
        <p className="text-xs text-ink-dim">
          Counts for questions asked after it is added. Everyone sees it in game chat.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasPoint || label.trim().length === 0 || isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? "Adding…" : "Add note"}
      </button>
    </div>
  );
}
