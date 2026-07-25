import { type AnnotationRecord } from "../../domain/map/annotations";
import { useSessionActivityLog } from "../../hooks/session/useSessionActivityLog";
import { SheetHeader } from "../ui/SheetHeader";
import { SheetHost } from "../ui/SheetHost";
import { SessionLogBody } from "./SessionLogBody";

interface SessionLogProps {
  open: boolean;
  sessionId: string;
  annotations: AnnotationRecord[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onSelect?: (id: string) => void;
  readOnly?: boolean;
}

export function SessionLog({
  open,
  sessionId,
  annotations,
  onClose,
  onDelete,
  onEdit,
  onSelect,
  readOnly = false,
}: SessionLogProps) {
  const events = useSessionActivityLog(sessionId);

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
        events={events}
        annotations={annotations}
        onDelete={onDelete}
        onEdit={onEdit}
        onSelect={onSelect}
        readOnly={readOnly}
      />
    </SheetHost>
  );
}
