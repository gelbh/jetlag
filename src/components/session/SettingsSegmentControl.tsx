export type SettingsSegment = "map" | "layers" | "rules" | "session";

const SEGMENTS: ReadonlyArray<{ id: SettingsSegment; label: string }> = [
  { id: "map", label: "Map" },
  { id: "layers", label: "Layers" },
  { id: "rules", label: "Rules" },
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
      className="jl-segment-control"
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
            className={`jl-segment-btn ${
              selected ? "jl-segment-btn-selected" : ""
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
