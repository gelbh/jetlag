import type { MapTool } from '../../state/sessionStore'

interface ToolDockProps {
  activeTool: MapTool
  onSelect: (tool: MapTool) => void
  onUndo: () => void
  onOpenLog: () => void
  onExport?: () => void
}

const tools: Array<{ id: MapTool; label: string; enabled: boolean }> = [
  { id: 'radar', label: 'Radar', enabled: true },
  { id: 'thermometer', label: 'Thermo', enabled: true },
  { id: 'zone', label: 'Zone', enabled: true },
  { id: 'pin', label: 'Pin', enabled: true },
  { id: 'tentacle', label: 'Tentacles', enabled: true },
]

export function ToolDock({
  activeTool,
  onSelect,
  onUndo,
  onOpenLog,
  onExport,
}: ToolDockProps) {
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-700/80 bg-slate-950/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              disabled={!tool.enabled}
              onClick={() => onSelect(activeTool === tool.id ? 'none' : tool.id)}
              className={`min-h-12 min-w-12 rounded-xl px-3 text-sm font-medium transition ${
                activeTool === tool.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-100 disabled:opacity-40'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium text-slate-100"
            >
              Export
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenLog}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium text-slate-100"
          >
            Log
          </button>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium text-slate-100"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  )
}
