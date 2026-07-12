import { useCallback, useMemo, useState } from "react";
import {
  annotationSummary,
  isActive,
  type AnnotationRecord,
  type GameArea,
} from "../../domain/map/annotations";
import {
  usedRadarDistanceOptions,
  usedThermometerDistanceOptions,
} from "../../domain/questions";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import { EditSheetFrame } from "./shared/EditSheetFrame";
import { annotationEditFields } from "./edit/annotationEditFields";
import type { EditSavePayload } from "./edit/types";

interface AnnotationEditSheetProps {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  onClose: () => void;
  onSave: (annotation: AnnotationRecord) => void;
  onDelete: (id: string) => void;
  onEditOnMap?: () => void;
}

export function AnnotationEditSheet({
  annotation,
  gameArea,
  onClose,
  onSave,
  onDelete,
  onEditOnMap,
}: AnnotationEditSheetProps) {
  return (
    <AnnotationEditSheetForm
      key={annotation.id}
      annotation={annotation}
      gameArea={gameArea}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      onEditOnMap={onEditOnMap}
    />
  );
}

function AnnotationEditSheetForm({
  annotation,
  gameArea,
  onClose,
  onSave,
  onDelete,
  onEditOnMap,
}: AnnotationEditSheetProps) {
  const distanceUnit = useSessionDistanceUnit();
  const gameSize = useSessionStore((state) => state.session?.gameSize ?? "medium");
  const annotations = useAnnotationStore((state) => state.annotations);
  const usedRadarOptions = useMemo(
    () =>
      usedRadarDistanceOptions(
        annotations.filter(isActive),
        distanceUnit,
        annotation.type === "radar" ? annotation.id : undefined,
      ),
    [annotations, annotation, distanceUnit],
  );
  const usedThermometerOptions = useMemo(
    () =>
      usedThermometerDistanceOptions(
        annotations.filter(isActive),
        annotation.type === "thermometer" ? annotation.id : undefined,
      ),
    [annotations, annotation],
  );
  const [savePayload, setSavePayload] = useState<EditSavePayload | null>(null);

  const handleSavePayloadChange = useCallback((payload: EditSavePayload) => {
    setSavePayload(payload);
  }, []);

  const handleSave = useCallback(() => {
    if (!savePayload?.canSave) {
      return;
    }

    const result = savePayload.save();
    if (result.type === "save") {
      onSave(result.annotation);
      return;
    }

    onClose();
  }, [onClose, onSave, savePayload]);

  return (
    <EditSheetFrame
      title={annotationSummary(annotation, distanceUnit)}
      onClose={onClose}
      onSave={savePayload?.canSave ? handleSave : undefined}
      onDelete={() => onDelete(annotation.id)}
    >
      {annotationEditFields(annotation, {
        gameArea,
        distanceUnit,
        gameSize,
        usedRadarOptions,
        usedThermometerOptions,
        onSavePayloadChange: handleSavePayloadChange,
      })}

      {onEditOnMap ? (
        <button type="button" onClick={onEditOnMap} className="btn-secondary w-full">
          Edit on map
        </button>
      ) : null}
    </EditSheetFrame>
  );
}
