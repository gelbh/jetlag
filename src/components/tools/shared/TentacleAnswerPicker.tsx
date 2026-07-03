import { useState } from "react";
import type { TentaclePoi } from "../../../domain/annotations";
import type { DistanceUnit } from "../../../domain/distance";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleHiderAnswerClipboardText,
  type TentacleLocationCategoryId,
} from "../../../domain/tentacleQuestions";
import { copyToClipboard } from "../../../platform/copyToClipboard";
import { ListSelectRow } from "./ListSelectRow";
import { ToolSection } from "./ToolSection";

interface TentacleAnswerPickerProps {
  categoryId: TentacleLocationCategoryId;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
}

export function TentacleAnswerPicker({
  categoryId,
  distanceUnit,
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
              );
              const ok = await copyToClipboard(text);
              setCopyStatus(ok ? "copied" : "failed");
              setTimeout(() => setCopyStatus("idle"), ok ? 2000 : 3000);
            })();
          }}
          className="btn-secondary min-h-9 px-3 text-xs"
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
          align="center"
          onClick={() => onOutOfReachChange(true)}
        >
          {TENTACLE_NOT_WITHIN_REACH_LABEL}
        </ListSelectRow>
      </div>
    </ToolSection>
  );
}
