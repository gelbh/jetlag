interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

interface SegmentControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentOption<Value>[];
  onChange: (value: Value) => void;
  variant?: "hud" | "pill";
  tone?: "highlight" | "action";
  "aria-label"?: string;
  disabled?: boolean;
}

export function SegmentControl<Value extends string>({
  value,
  options,
  onChange,
  variant = "hud",
  tone = "highlight",
  "aria-label": ariaLabel,
  disabled = false,
}: SegmentControlProps<Value>) {
  if (variant === "pill") {
    return (
      <div className="flex gap-2" role="group" aria-label={ariaLabel}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              aria-pressed={selected}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                selected
                  ? "bg-highlight-soft text-highlight"
                  : "text-ink-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (tone === "action") {
    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              aria-pressed={selected}
              className={`min-h-12 rounded-[var(--radius-hud-md)] px-2 text-sm font-medium disabled:opacity-50 ${
                selected
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink-secondary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="jl-segment-control"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`jl-segment-btn ${
              selected ? "jl-segment-btn-selected" : ""
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
