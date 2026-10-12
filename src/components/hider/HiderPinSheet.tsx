import { type AnnotationRecord, isActive } from "../../domain/map/annotations";
import { EditSheetFrame } from "../tools/shared/panels/EditSheetFrame";

interface HiderPinSheetProps {
  annotation: AnnotationRecord | null;
  uid: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

/** Firestore rules let a hider soft-delete only their own active pin, so nothing else shows here. */
export function HiderPinSheet({ annotation, uid, onClose, onDelete }: HiderPinSheetProps) {
  if (
    !annotation ||
    !uid ||
    annotation.type !== "pin" ||
    !isActive(annotation) ||
    annotation.metadata.createdByUid !== uid
  ) {
    return null;
  }

  return (
    <EditSheetFrame
      title={annotation.metadata.label || "Pin"}
      onClose={onClose}
      onDelete={() => onDelete(annotation.id)}
    >
      <p className="text-sm text-field-ink-muted">Deleting removes this pin for everyone.</p>
    </EditSheetFrame>
  );
}
