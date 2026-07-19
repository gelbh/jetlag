import {
  type AnnotationRecord,
} from "../../domain/map/annotations";
import { SheetHeader } from "../ui/SheetHeader";
import { SheetHost } from "../ui/SheetHost";
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
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Session log"
      railTab="log"
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
    </SheetHost>
  );
}
