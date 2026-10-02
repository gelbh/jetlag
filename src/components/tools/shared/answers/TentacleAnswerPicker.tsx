import { Text, UnstyledButton } from "@mantine/core";
import { choiceChipStyles } from "@/components/ui/entry/entryChrome";
import { isConfirmedPoiLike } from "@/domain/geo/poiCandidateAdapters";
import type { TentaclePoi } from "@/domain/map/annotations";
import { TENTACLE_NOT_WITHIN_REACH_LABEL } from "@/domain/questions";
import { ProvisionalBadge } from "../readout/ProvisionalBadge";

interface TentacleAnswerPickerProps {
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
}

function choiceRowStyles(selected: boolean, tone: "default" | "danger" = "default") {
  const base = choiceChipStyles(selected, tone);
  return {
    root: {
      ...base.root,
      width: "100%",
      justifyContent: "flex-start",
      textAlign: "left" as const,
      minHeight: "2.875rem",
      borderRadius: 12,
      paddingInline: "0.85rem",
      fontSize: "0.9375rem",
      letterSpacing: "-0.01em",
    },
  };
}

export function TentacleAnswerPicker({
  poiOptions,
  selectedPoiId,
  outOfReach,
  onSelectPoi,
  onOutOfReachChange,
}: TentacleAnswerPickerProps) {
  if (poiOptions.length === 0) {
    return null;
  }

  return (
    <div data-testid="tentacle-answer-picker" className="flex flex-col gap-2" data-wizard-no-swipe>
      <Text
        size="sm"
        style={{
          color: "var(--color-field-ink-muted)",
          fontWeight: 510,
          letterSpacing: "-0.01em",
        }}
      >
        Choose one
      </Text>

      <div className="flex flex-col gap-1.5" role="list" aria-label="Tentacle answers">
        {poiOptions.map((poi) => {
          const confirmed = isConfirmedPoiLike(poi);
          const selected = selectedPoiId === poi.id;
          return (
            <div key={poi.id} role="listitem">
              <UnstyledButton
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectPoi(poi.id)}
                styles={choiceRowStyles(selected)}
              >
                <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="min-w-0 leading-snug">{poi.name}</span>
                  {confirmed ? null : <ProvisionalBadge />}
                </span>
              </UnstyledButton>
            </div>
          );
        })}
        <div role="listitem">
          <UnstyledButton
            type="button"
            aria-pressed={outOfReach}
            onClick={() => onOutOfReachChange(true)}
            styles={choiceRowStyles(outOfReach, outOfReach ? "danger" : "default")}
          >
            {TENTACLE_NOT_WITHIN_REACH_LABEL}
          </UnstyledButton>
        </div>
      </div>
    </div>
  );
}
