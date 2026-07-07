import { useState } from "react";
import type { TentaclePoi } from "../../../domain/map/annotations";
import type { DistanceUnit } from "../../../domain/map/distance";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleHiderAnswerClipboardText,
  type TentacleExtendedCategoryId,
} from "../../../domain/questions/tentacleQuestions";
import { copyToClipboard } from "../../../platform/copyToClipboard";
import { ListSelectRow } from "./ListSelectRow";
import { ToolSection } from "./ToolSection";

interface TentacleAnswerPickerProps {
  categoryId: TentacleExtendedCategoryId;
  distanceUnit: DistanceUnit;
  searchRadiusMeters: number;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
}

export function TentacleAnswerPicker({
  categoryId,
  distanceUnit,
  searchRadiusMeters,
  poiOptions,
  selectedPoiId,
  outOfReach,
  onSelectPoi,
  onOutOfReachChange,
}: TentacleAnswerPickerProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  if (poiOptions.length === 0) {
    return null;
  }

  return (
    <ToolSection title="Answer" status="active">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="field-label m-0">Choose one</p>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const text = tentacleHiderAnswerClipboardText(
                categoryId,
                distanceUnit,
                poiOptions,
                searchRadiusMeters,
              );
              const ok = await copyToClipboard(text);
              setCopyStatus(ok ? "copied" : "failed");
              setTimeout(() => setCopyStatus("idle"), ok ? 2000 : 3000);
            })();
          }}
          className="btn-secondary min-h-12 px-3 text-xs"
        >
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "failed"
              ? "Copy failed"
              : "Copy for hider"}
        </button>
      </div>
      <div className="space-y-1">
        {poiOptions.map((poi) => (
          <ListSelectRow
            key={poi.id}
            selected={selectedPoiId === poi.id}
            onClick={() => onSelectPoi(poi.id)}
          >
            {poi.name}
          </ListSelectRow>
        ))}
        <ListSelectRow
          selected={outOfReach}
          onClick={() => onOutOfReachChange(true)}
        >
          {TENTACLE_NOT_WITHIN_REACH_LABEL}
        </ListSelectRow>
      </div>
    </ToolSection>
  );
}
