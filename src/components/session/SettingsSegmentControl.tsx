export type SettingsSegment = "map" | "layers" | "session";

const SEGMENTS: ReadonlyArray<{ id: SettingsSegment; label: string }> = [
  { id: "map", label: "Map" },
  { id: "layers", label: "Layers" },
  { id: "session", label: "Session" },
];

interface SettingsSegmentControlProps {
  value: SettingsSegment;
  onChange: (segment: SettingsSegment) => void;
}

export function SettingsSegmentControl({
  value,
  onChange,
}: SettingsSegmentControlProps) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-[var(--radius-hud-md)] bg-surface-raised p-1"
      role="tablist"
      aria-label="Settings sections"
    >
      {SEGMENTS.map((segment) => {
        const selected = value === segment.id;

        return (
          <button
            key={segment.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(segment.id)}
            className={`min-h-12 rounded-[var(--radius-hud-sm)] px-2 text-sm font-medium transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none ${
              selected
                ? "bg-action text-action-ink"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
