interface ThermometerPanelProps {
  step: 'a' | 'b' | 'ready'
  onReset: () => void
  onCommit: () => void
}

export function ThermometerPanel({ step, onReset, onCommit }: ThermometerPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Tap the map for the start of seeker movement, then the end. The colder half of the map
        will be shaded.
      </p>
      <p className="text-sm text-slate-400">
        {step === 'a' && 'Waiting for start pin'}
        {step === 'b' && 'Waiting for end pin'}
        {step === 'ready' && 'Ready to add thermometer'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={step !== 'ready'}
          className="min-h-12 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          Add thermometer
        </button>
      </div>
    </div>
  )
}
