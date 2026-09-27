import { Text } from "@mantine/core";
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
      padding="sm"
      maxHeightClassName="max-h-[min(85dvh,40rem)]"
      pinned={
        <Text
          component="h2"
          size="md"
          fw={600}
          mb={2}
          lh={1.2}
          c="var(--color-field-ink)"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.04em",
          }}
        >
          Session log
        </Text>
      }
    >
      <SessionLogBody
        events={events}
        annotations={annotations}
        onDelete={onDelete}
        onEdit={onEdit}
        onSelect={onSelect}
        readOnly={readOnly}
        compact
      />
    </SheetHost>
  );
}
