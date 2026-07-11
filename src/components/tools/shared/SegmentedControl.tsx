import { HudSegmentControl } from "../../ui/HudSegmentControl";

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onChange: (value: Value) => void;
  "aria-label"?: string;
}

export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>,
) {
  return <HudSegmentControl tone="action" {...props} />;
}
