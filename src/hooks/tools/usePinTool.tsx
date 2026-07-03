import { useCallback, useState } from "react";
import { PinPanel } from "../../components/tools/PinPanel";
import type { LatLngTuple } from "../../domain/geometry";
import type { AnnotationRecord } from "../../domain/annotations";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UsePinToolParams {
  active: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  finishPlacement: () => void;
}

export function usePinTool({
  active,
  createAnnotation,
  finishPlacement,
}: UsePinToolParams) {
  const [pinLabel, setPinLabel] = useState("");
  const [pinPoint, setPinPoint] = useState<LatLngTuple | null>(null);

  const resetDraft = useCallback(() => {
    setPinLabel("");
    setPinPoint(null);
  }, []);

  const handleMapClick = useCallback((point: LatLngTuple) => {
    setPinPoint(point);
  }, []);

  const commit = useCallback(async () => {
    if (!pinPoint || pinLabel.trim().length === 0) {
      return;
    }

    await createAnnotation({
      type: "pin",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [pinPoint[1], pinPoint[0]],
        },
      },
      metadata: {
        createdAt: new Date().toISOString(),
        label: pinLabel.trim(),
        color: MAP_ANNOTATION_COLORS.pin,
      },
    });

    resetDraft();
    finishPlacement();
  }, [createAnnotation, finishPlacement, pinLabel, pinPoint, resetDraft]);

  const placementCrosshair = active && pinPoint === null;

  const panel = (
    <PinPanel
      label={pinLabel}
      onLabelChange={setPinLabel}
      onCommit={() => void commit()}
      hasPoint={pinPoint !== null}
    />
  );

  return {
    draft: { pinPoint },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    panel,
  };
}
