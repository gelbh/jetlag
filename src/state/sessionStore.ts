import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnnotationRecord, GameArea, PlayerMode } from '../domain/annotations'
import { LOCAL_SESSION_ID, createAnnotationId } from '../domain/annotations'
import type { SessionRecord } from '../domain/annotations'

export type MapTool = 'none' | 'radar' | 'thermometer' | 'zone' | 'pin' | 'tentacle'

interface SessionState {
  session: SessionRecord | null
  playerMode: PlayerMode
  pendingWrites: number
  setSession: (session: SessionRecord | null) => void
  setGameArea: (gameArea: GameArea) => void
  setPlayerMode: (mode: PlayerMode) => void
  setPendingWrites: (count: number) => void
  incrementPendingWrites: () => void
  decrementPendingWrites: () => void
}

interface AnnotationState {
  annotations: AnnotationRecord[]
  selectedAnnotationId: string | null
  pulsingAnnotationIds: string[]
  setAnnotations: (annotations: AnnotationRecord[]) => void
  upsertAnnotation: (annotation: AnnotationRecord) => void
  addAnnotation: (
    annotation: Omit<AnnotationRecord, 'id' | 'sessionId' | 'status'> & {
      id?: string
      sessionId?: string
    },
  ) => AnnotationRecord
  softDeleteAnnotation: (id: string) => void
  undoLastAnnotation: () => void
  setSelectedAnnotationId: (id: string | null) => void
  markAnnotationPulse: (id: string) => void
  clearAnnotationPulse: (id: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      playerMode: 'seeker',
      pendingWrites: 0,
      setSession: (session) => set({ session }),
      setGameArea: (gameArea) =>
        set((state) =>
          state.session
            ? {
                session: {
                  ...state.session,
                  gameArea,
                },
              }
            : state,
        ),
      setPlayerMode: (playerMode) => set({ playerMode }),
      setPendingWrites: (pendingWrites) => set({ pendingWrites }),
      incrementPendingWrites: () =>
        set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
      decrementPendingWrites: () =>
        set((state) => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) })),
    }),
    {
      name: 'jetlag-session',
      partialize: (state) => ({ session: state.session, playerMode: state.playerMode }),
    },
  ),
)

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set, get) => ({
      annotations: [],
      selectedAnnotationId: null,
      pulsingAnnotationIds: [],
      setAnnotations: (annotations) => set({ annotations }),
      upsertAnnotation: (annotation) =>
        set((state) => {
          const existingIndex = state.annotations.findIndex(
            (item) => item.id === annotation.id,
          )

          if (existingIndex === -1) {
            return { annotations: [...state.annotations, annotation] }
          }

          const next = [...state.annotations]
          next[existingIndex] = annotation
          return { annotations: next }
        }),
      addAnnotation: (annotation) => {
        const next: AnnotationRecord = {
          id: annotation.id ?? createAnnotationId(),
          sessionId: annotation.sessionId ?? LOCAL_SESSION_ID,
          type: annotation.type,
          geometry: annotation.geometry,
          metadata: annotation.metadata,
          status: 'active',
        }

        set((state) => ({
          annotations: [...state.annotations, next],
        }))

        return next
      },
      softDeleteAnnotation: (id) =>
        set((state) => ({
          annotations: state.annotations.map((annotation) =>
            annotation.id === id
              ? { ...annotation, status: 'deleted' as const }
              : annotation,
          ),
        })),
      undoLastAnnotation: () => {
        const active = get()
          .annotations.filter((annotation) => annotation.status === 'active')
          .at(-1)

        if (!active) {
          return
        }

        get().softDeleteAnnotation(active.id)
      },
      setSelectedAnnotationId: (selectedAnnotationId) => set({ selectedAnnotationId }),
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
      name: 'jetlag-annotations',
      partialize: (state) => ({ annotations: state.annotations }),
    },
  ),
)

export const useMapStore = create<{
  activeTool: MapTool
  setActiveTool: (tool: MapTool) => void
}>((set) => ({
  activeTool: 'none',
  setActiveTool: (activeTool) => set({ activeTool }),
}))
