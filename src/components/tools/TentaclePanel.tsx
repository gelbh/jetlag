import { useState } from "react";
import type { TentaclePoi } from "../../domain/annotations";
import type { DistanceUnit } from "../../domain/distance";
import {
  isTentacleCategoryAvailable,
  TENTACLE_LOCATION_CATEGORIES,
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleHiderAnswerClipboardText,
  tentacleQuestionPrompt,
  type TentacleLocationCategoryId,
} from "../../domain/tentacleQuestions";
import { copyToClipboard } from "../../platform/copyToClipboard";
import { PlacementActions } from "./shared/PlacementActions";
import { ToolPanelShell } from "./shared/ToolPanelShell";

interface TentaclePanelProps {
  categoryId: TentacleLocationCategoryId;
  usedCategoryIds: ReadonlySet<TentacleLocationCategoryId>;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading?: boolean;
  error?: string | null;
  onCategoryChange: (categoryId: TentacleLocationCategoryId) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onLoadPois: () => void;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
  onCommit: () => void;
}

export function TentaclePanel({
  categoryId,
  usedCategoryIds,
  distanceUnit,
  poiOptions,
  selectedPoiId,
  outOfReach,
  loading,
  awaitingPlacement,
  hasCenter,
  gpsLoading = false,
  error,
  onCategoryChange,
  onUseGps,
  onPlaceAtMapTap,
  onLoadPois,
  onSelectPoi,
  onOutOfReachChange,
  onCommit,
}: TentaclePanelProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const prompt = tentacleQuestionPrompt(categoryId, distanceUnit);
  const categorySelectionAvailable = isTentacleCategoryAvailable(
    categoryId,
    usedCategoryIds,
  );
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;
  const canCommit =
    hasCenter &&
    poiOptions.length > 0 &&
    hasRecordedAnswer &&
    categorySelectionAvailable;
  const availableCategories = TENTACLE_LOCATION_CATEGORIES.filter((category) =>
    isTentacleCategoryAvailable(category.id, usedCategoryIds),
  );

  return (
    <ToolPanelShell
      toolId="tentacle"
      helper="Pick a location type, pin your anchor, and load options within 1 mile. After a named answer, the map shows a 1½ mile radar (within 1 mile plus hiding zone at the limit)."
    >
      <p className="text-sm font-medium text-slate-100">{prompt}</p>
      <p className="text-sm text-slate-400">
        Search radius is fixed at 1 mile from your anchor.
      </p>

      <label className="block text-sm text-slate-300">
        Location type
        <select
          value={categoryId}
          onChange={(event) => {
            setCopyStatus("idle");
            onCategoryChange(event.target.value as TentacleLocationCategoryId);
          }}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
        >
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <PlacementActions
        awaitingPlacement={awaitingPlacement}
        hasCenter={hasCenter}
        gpsLoading={gpsLoading}
        onUseGps={onUseGps}
        onPlaceAtMapTap={onPlaceAtMapTap}
        centerHint="Anchor pinned on the map. Tap again to move it."
      />

      <button
        type="button"
        onClick={() => {
          setCopyStatus("idle");
          onLoadPois();
        }}
        disabled={!hasCenter || loading}
        className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
      >
        {loading ? "Loading…" : "Load locations"}
      </button>

      {poiOptions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">Answer</p>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const text = tentacleHiderAnswerClipboardText(
                    categoryId,
                    distanceUnit,
                    poiOptions,
                  );
                  const ok = await copyToClipboard(text);
                  setCopyStatus(ok ? "copied" : "failed");
                  setTimeout(() => setCopyStatus("idle"), ok ? 2000 : 3000);
                })();
              }}
              className="min-h-9 rounded-lg bg-slate-700 px-3 text-xs font-medium text-slate-100"
            >
              {copyStatus === "copied"
                ? "Copied"
                : copyStatus === "failed"
                  ? "Copy failed"
                  : "Copy list for hiders"}
            </button>
          </div>
          <div className="space-y-2">
            {poiOptions.map((poi) => (
              <button
                key={poi.id}
                type="button"
                onClick={() => onSelectPoi(poi.id)}
                className={`min-h-12 w-full rounded-xl px-3 text-left text-sm ${
                  selectedPoiId === poi.id
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800"
                }`}
              >
                {poi.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onOutOfReachChange(true)}
              className={`min-h-12 w-full rounded-xl px-3 text-sm ${
                outOfReach ? "bg-emerald-500 text-slate-950" : "bg-slate-800"
              }`}
            >
              {TENTACLE_NOT_WITHIN_REACH_LABEL}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add tentacle question
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </ToolPanelShell>
  );
}
