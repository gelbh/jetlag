/**
 * Map-first Tentacle answer chrome: selection lives on map pins;
 * this strip mirrors the choice, Not within reach, and solo copy-to-hider.
 */
import { Button, Text } from "@mantine/core";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  tentacleHiderAnswerClipboardText,
  type TentacleExtendedCategoryId,
} from "@/domain/questions";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import { useCopyFeedback } from "@/hooks/forms/useCopyFeedback";
import {
  iosChoiceChipStyles,
  iosCompactGrayStyles,
  iosMapChromeSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";

export type TentacleMapAnswerStripProps = {
  categoryId: TentacleExtendedCategoryId;
  distanceUnit: DistanceUnit;
  searchRadiusMeters: number;
  poiOptions: readonly TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  onOutOfReachChange: (outOfReach: boolean) => void;
  /** Solo / no in-app hider: show clipboard helper for offline hiders. */
  showCopyForHider?: boolean;
};

const COPY_LOCATIONS_LABEL = "Copy locations to send to hider";

function copyLabel(status: "idle" | "copied" | "failed"): string {
  if (status === "copied") return "Copied";
  if (status === "failed") return "Copy failed";
  return COPY_LOCATIONS_LABEL;
}

export function TentacleMapAnswerStrip({
  categoryId,
  distanceUnit,
  searchRadiusMeters,
  poiOptions,
  selectedPoiId,
  outOfReach,
  onOutOfReachChange,
  showCopyForHider = false,
}: TentacleMapAnswerStripProps) {
  const { status: copyStatus, copy } = useCopyFeedback();

  const selectedName =
    !outOfReach && selectedPoiId
      ? (poiOptions.find((poi) => poi.id === selectedPoiId)?.name ?? null)
      : null;

  const statusLabel = outOfReach
    ? TENTACLE_NOT_WITHIN_REACH_LABEL
    : (selectedName ?? "Tap a place on the map");

  const handleCopyForHider = async () => {
    const text = tentacleHiderAnswerClipboardText(
      categoryId,
      distanceUnit,
      poiOptions,
      searchRadiusMeters,
    );
    await copy(text);
  };

  return (
    <div
      data-testid="tentacle-map-answer-strip"
      data-player-ux-world="mantine"
      className="flex flex-col gap-2"
      style={{
        ...iosMapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.65rem 0.7rem",
        color: "var(--color-field-ink)",
      }}
    >
      <Text
        size="sm"
        fw={selectedName || outOfReach ? 590 : 510}
        style={{
          letterSpacing: "-0.01em",
          color:
            selectedName || outOfReach
              ? "var(--color-field-ink)"
              : "var(--color-field-ink-muted)",
          lineHeight: 1.3,
        }}
      >
        {statusLabel}
      </Text>

      {showCopyForHider ? (
        <Button
          type="button"
          fullWidth
          onClick={() => void handleCopyForHider()}
          aria-label={COPY_LOCATIONS_LABEL}
          styles={{
            root: {
              ...iosCompactGrayStyles.root,
              width: "100%",
              minHeight: "2.25rem",
              height: "auto",
              paddingBlock: "0.45rem",
              paddingInline: "0.75rem",
              fontSize: "0.8125rem",
              lineHeight: 1.25,
              textTransform: "none",
              whiteSpace: "normal",
            },
          }}
        >
          {copyLabel(copyStatus)}
        </Button>
      ) : null}

      <Button
        type="button"
        fullWidth
        aria-pressed={outOfReach}
        onClick={() => onOutOfReachChange(true)}
        styles={{
          root: {
            ...iosChoiceChipStyles(outOfReach, outOfReach ? "danger" : "default")
              .root,
            width: "100%",
            justifyContent: "center",
            minHeight: "2.5rem",
            borderRadius: 12,
            fontSize: "0.875rem",
          },
        }}
      >
        {TENTACLE_NOT_WITHIN_REACH_LABEL}
      </Button>
    </div>
  );
}
