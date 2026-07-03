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

export function SegmentedControl<Value extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedControlProps<Value>) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-12 rounded-[var(--radius-hud-md)] px-2 text-sm font-medium ${
            value === option.value
              ? "bg-action text-action-ink"
              : "bg-surface-raised text-ink-secondary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
