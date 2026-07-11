import { HudSegmentControl } from "../ui/HudSegmentControl";

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
    <HudSegmentControl
      value={value}
      options={SEGMENTS.map((segment) => ({
        value: segment.id,
        label: segment.label,
      }))}
      onChange={onChange}
      aria-label="Settings sections"
    />
  );
}
