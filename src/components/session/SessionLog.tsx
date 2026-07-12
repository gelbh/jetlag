import {
  type AnnotationRecord,
} from "../../domain/map/annotations";
import { MotionSheet } from "../motion/MotionSheet";
import { SheetHeader } from "../ui/SheetHeader";
import { SessionLogBody } from "./SessionLogBody";

interface SessionLogProps {
  open: boolean;
  annotations: AnnotationRecord[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  readOnly?: boolean;
}

export function SessionLog({
  open,
  annotations,
  onClose,
  onDelete,
  onEdit,
  readOnly = false,
}: SessionLogProps) {
  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Session log"
      maxHeightClassName="max-h-[min(85dvh,720px)]"
    >
      <SheetHeader
        title="Session log"
        onClose={onClose}
        closeVariant="raised"
        flush
        className="shrink-0"
      />

      <SessionLogBody
        annotations={annotations}
        onDelete={onDelete}
        onEdit={onEdit}
        readOnly={readOnly}
      />
    </MotionSheet>
  );
}
