import { useId, useState } from "react";
import { regionPackDisplayLabel } from "@/domain/regions/regionPackDisplayLabel";
import {
  REGION_PACK_IDS,
  type RegionPackId,
} from "@/domain/regions/regionPack";

export type PackAttachSource = "auto" | "manual" | "bundled";

export interface PackAttachChipProps {
  packId: RegionPackId;
  source: PackAttachSource;
  onClear: () => void;
  onChangePack: (packId: RegionPackId) => void;
  packOptions?: readonly RegionPackId[];
}

function sourceHint(source: PackAttachSource): string {
  if (source === "manual") {
    return "Chosen manually";
  }
  if (source === "bundled") {
    return "From preset";
  }
  return "Matched to play area";
}

export function PackAttachChip({
  packId,
  source,
  onClear,
  onChangePack,
  packOptions = REGION_PACK_IDS,
}: PackAttachChipProps) {
  const labelId = useId();
  const selectId = useId();
  const [changing, setChanging] = useState(false);
  const label = regionPackDisplayLabel(packId);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      role="group"
      aria-labelledby={labelId}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          id={labelId}
          className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim"
        >
          Location pack
        </p>
        <p className="text-sm text-ink">
          {label}
          <span className="text-ink-muted"> · {sourceHint(source)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {changing ? (
          <label
            htmlFor={selectId}
            className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-ink-muted"
          >
            <span className="sr-only">Change location pack</span>
            <select
              id={selectId}
              className="field-input min-h-11 flex-1 py-2 text-sm"
              value={packId}
              onChange={(event) => {
                onChangePack(event.target.value as RegionPackId);
                setChanging(false);
              }}
              onBlur={() => setChanging(false)}
              autoFocus
            >
              {packOptions.map((option) => (
                <option key={option} value={option}>
                  {regionPackDisplayLabel(option)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="font-display text-xs font-semibold uppercase tracking-wide text-brand-blue"
          >
            Change
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="font-display text-xs font-semibold uppercase tracking-wide text-error"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
