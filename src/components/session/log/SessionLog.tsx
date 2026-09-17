import { type AnnotationRecord } from "@/domain/map/annotations";
import { useSessionActivityLog } from "@/hooks/session/useSessionActivityLog";
import { SheetHost } from "../../ui/sheets/SheetHost";
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
      maxHeightClassName="max-h-[min(85dvh,40rem)]"
      pinned={
        <h2 className="mb-1 text-[1.375rem] font-bold tracking-tight text-field-ink">
          Session log
        </h2>
      }
    >
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
