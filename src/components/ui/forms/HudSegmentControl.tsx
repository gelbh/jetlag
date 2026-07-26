import { SegmentControl } from "./SegmentControl";

interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
}

interface HudSegmentControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentOption<Value>[];
  onChange: (value: Value) => void;
  tone?: "highlight" | "action";
  "aria-label"?: string;
  disabled?: boolean;
}

export function HudSegmentControl<Value extends string>({
  tone = "highlight",
  ...props
}: HudSegmentControlProps<Value>) {
  return <SegmentControl variant="hud" tone={tone} {...props} />;
}
