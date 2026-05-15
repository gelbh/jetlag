import { annotationSummary, isActive, type AnnotationRecord } from '../../domain/annotations'

interface SessionLogProps {
  open: boolean
  annotations: AnnotationRecord[]
  onClose: () => void
  onDelete: (id: string) => void
}

export function SessionLog({ open, annotations, onClose, onDelete }: SessionLogProps) {
  if (!open) {
    return null
  }

  const active = annotations.filter(isActive).slice().reverse()

  return (
    <div className="pointer-events-auto fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl border border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session log</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl bg-slate-800 px-4 text-sm font-medium"
          >
            Close
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {active.length === 0 ? (
            <p className="text-sm text-slate-400">No annotations yet.</p>
          ) : (
            active.map((annotation) => (
              <div
                key={annotation.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/80 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{annotationSummary(annotation)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(annotation.metadata.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(annotation.id)}
                  className="min-h-12 rounded-xl bg-rose-500/20 px-3 text-sm text-rose-200"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
