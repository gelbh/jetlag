import type { AnnotationRecord } from "../../../domain/map/annotations";

export type EditSaveResult =
  | { type: "save"; annotation: AnnotationRecord }
  | { type: "close" };

export interface EditSavePayload {
  canSave: boolean;
  save: () => EditSaveResult;
}
