import { useCallback, useEffect, useState } from "react";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import { TextField } from "../../ui/TextField";
import type { EditSavePayload, EditSaveResult } from "./types";

export type PinZoneAnnotation = AnnotationRecord & {
  type: "pin" | "zone";
};

interface PinZoneEditFieldsProps {
  annotation: PinZoneAnnotation;
  onSavePayloadChange: (payload: EditSavePayload) => void;
}

export function PinZoneEditFields({
  annotation,
  onSavePayloadChange,
}: PinZoneEditFieldsProps) {
  const [label, setLabel] = useState(annotation.metadata.label ?? "");

  const save = useCallback((): EditSaveResult => {
    return {
      type: "save",
      annotation: {
        ...annotation,
        metadata: {
          ...annotation.metadata,
          label: label.trim(),
        },
      },
    };
  }, [annotation, label]);

  useEffect(() => {
    onSavePayloadChange({ canSave: true, save });
  }, [onSavePayloadChange, save]);

  return (
    <TextField
      label="Label"
      labelClassName="block text-sm text-ink-muted"
      inputClassName="mt-1 min-h-12 w-full rounded-xl border border-border bg-surface-base px-3"
      value={label}
      onChange={(event) => setLabel(event.target.value)}
    />
  );
}
