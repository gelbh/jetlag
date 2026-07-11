import { SegmentControl } from "../../ui/SegmentControl";

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

export function SegmentedControl<Value extends string>(props: SegmentedControlProps<Value>) {
  return <SegmentControl variant="hud" tone="action" {...props} />;
}
