import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnnotationRecord } from "../domain/map/annotations";
import {
  LOCAL_SESSION_ID,
  createAnnotationId,
  migrateAnnotations,
} from "../domain/map/annotations";

interface AnnotationState {
  annotations: AnnotationRecord[];
  redoAnnotationIds: string[];
  selectedAnnotationId: string | null;
  geometryEditAnnotationId: string | null;
  pulsingAnnotationIds: string[];
  setAnnotations: (annotations: AnnotationRecord[]) => void;
  upsertAnnotation: (annotation: AnnotationRecord) => void;
  addAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status"> & {
      id?: string;
      sessionId?: string;
    },
  ) => AnnotationRecord;
  softDeleteAnnotation: (id: string) => void;
  softDeleteAllForSession: (sessionId: string) => void;
  pushRedoAnnotationId: (id: string) => void;
  removeRedoAnnotationId: (id: string) => void;
  clearRedoStack: () => void;
  undoLastAnnotation: () => void;
  setSelectedAnnotationId: (id: string | null) => void;
  setGeometryEditAnnotationId: (id: string | null) => void;
  markAnnotationPulse: (id: string) => void;
  clearAnnotationPulse: (id: string) => void;
}

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set, get) => ({
      annotations: [],
      redoAnnotationIds: [],
      selectedAnnotationId: null,
      geometryEditAnnotationId: null,
      pulsingAnnotationIds: [],
      setAnnotations: (annotations) =>
        set({ annotations: migrateAnnotations(annotations) }),
      upsertAnnotation: (annotation) =>
        set((state) => {
          const existingIndex = state.annotations.findIndex(
            (item) => item.id === annotation.id,
          );

          if (existingIndex === -1) {
            return { annotations: [...state.annotations, annotation] };
          }

          const next = [...state.annotations];
          next[existingIndex] = annotation;
          return { annotations: next };
        }),
      addAnnotation: (annotation) => {
        const next: AnnotationRecord = {
          id: annotation.id ?? createAnnotationId(),
          sessionId: annotation.sessionId ?? LOCAL_SESSION_ID,
          type: annotation.type,
          geometry: annotation.geometry,
          metadata: annotation.metadata,
          status: "active",
        };

        set((state) => ({
          annotations: [...state.annotations, next],
        }));

        return next;
      },
      softDeleteAnnotation: (id) =>
        set((state) => ({
          annotations: state.annotations.map((annotation) =>
            annotation.id === id
              ? { ...annotation, status: "deleted" as const }
              : annotation,
          ),
        })),
      softDeleteAllForSession: (sessionId) =>
        set((state) => ({
          annotations: state.annotations.map((annotation) =>
            annotation.sessionId === sessionId && annotation.status === "active"
              ? { ...annotation, status: "deleted" as const }
              : annotation,
          ),
        })),
      pushRedoAnnotationId: (id) =>
        set((state) => ({
          redoAnnotationIds: state.redoAnnotationIds.includes(id)
            ? state.redoAnnotationIds
            : [...state.redoAnnotationIds, id],
        })),
      removeRedoAnnotationId: (id) =>
        set((state) => ({
          redoAnnotationIds: state.redoAnnotationIds.filter(
            (annotationId) => annotationId !== id,
          ),
        })),
      clearRedoStack: () => set({ redoAnnotationIds: [] }),
      undoLastAnnotation: () => {
        const active = get()
          .annotations.filter((annotation) => annotation.status === "active")
          .at(-1);

        if (!active) {
          return;
        }

        get().softDeleteAnnotation(active.id);
      },
      setSelectedAnnotationId: (selectedAnnotationId) =>
        set({ selectedAnnotationId }),
      setGeometryEditAnnotationId: (geometryEditAnnotationId) =>
        set({ geometryEditAnnotationId }),
      markAnnotationPulse: (id) =>
        set((state) => ({
          pulsingAnnotationIds: state.pulsingAnnotationIds.includes(id)
            ? state.pulsingAnnotationIds
            : [...state.pulsingAnnotationIds, id],
        })),
      clearAnnotationPulse: (id) =>
        set((state) => ({
          pulsingAnnotationIds: state.pulsingAnnotationIds.filter(
            (annotationId) => annotationId !== id,
          ),
        })),
    }),
    {
      name: "jetlag-annotations",
      partialize: (state) => {
        let sessionId: string | undefined;
        try {
          const raw = localStorage.getItem("jetlag-session");
          sessionId = raw
            ? (JSON.parse(raw) as { state?: { session?: { id?: string } } })
                .state?.session?.id
            : undefined;
        } catch {
          sessionId = undefined;
        }

        const annotations =
          sessionId === undefined
            ? state.annotations
            : state.annotations.filter(
                (annotation) => annotation.sessionId === sessionId,
              );

        return { annotations };
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as AnnotationState | undefined) ?? {}),
        annotations: migrateAnnotations(
          (persistedState as AnnotationState | undefined)?.annotations ??
            currentState.annotations,
        ),
      }),
    },
  ),
);
