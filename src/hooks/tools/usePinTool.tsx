import { useCallback, useEffect, useRef, useState } from "react";
import { PinPanel } from "../../components/tools/PinPanel";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import { POI_PIN_CATEGORIES, type PoiPinCategoryId } from "../../domain/map/poiPinCategories";
import { useToolSession } from "./framework/useToolSession";

interface PinSessionConfig {
  ready: true;
}

interface UsePinToolParams {
  active: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  finishPlacement: () => void;
  postSystemMessage: (text: string) => void;
}

export function usePinTool({
  active,
  createAnnotation,
  finishPlacement,
  postSystemMessage,
}: UsePinToolParams) {
  const [pinLabel, setPinLabel] = useState("");
  const [pinPoint, setPinPoint] = useState<LatLngTuple | null>(null);
  const [poiCategory, setPoiCategory] = useState<PoiPinCategoryId | null>(null);
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const resetDraft = useCallback(() => {
    setPinLabel("");
    setPinPoint(null);
    setPoiCategory(null);
  }, []);

  const handleMapClick = useCallback((point: LatLngTuple) => {
    setPinPoint(point);
  }, []);

  const session = useToolSession<PinSessionConfig>({
    toolId: "pin",
    active,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      const label = pinLabel.trim();
      if (!pinPoint || label.length === 0) {
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
          label,
          color: MAP_ANNOTATION_COLORS.pin,
          ...(poiCategory ? { poiCategory } : {}),
        },
      });

      const categoryLabel = POI_PIN_CATEGORIES.find((c) => c.id === poiCategory)?.label;
      if (categoryLabel) {
        postSystemMessage(`Seeker added ${categoryLabel} pin: ${label}`);
      }

      resetDraft();
      finishPlacementRef.current();
    },
  });

  const placementCrosshair = active && pinPoint === null;

  const panel = (
    <PinPanel
      label={pinLabel}
      onLabelChange={setPinLabel}
      poiCategory={poiCategory}
      onPoiCategoryChange={setPoiCategory}
      onCommit={() => void session.submit()}
      hasPoint={pinPoint !== null}
      isSubmitting={session.isBusy}
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
