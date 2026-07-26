import type { ReactNode } from "react";

interface RadioCardOption<Value extends string> {
  value: Value;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
}

interface RadioCardGroupProps<Value extends string> {
  value: Value;
  options: readonly RadioCardOption<Value>[];
  onChange: (value: Value) => void;
  "aria-label": string;
  label?: ReactNode;
  disabled?: boolean;
}

export function RadioCardGroup<Value extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  label,
  disabled = false,
}: RadioCardGroupProps<Value>) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
          {label}
        </p>
      ) : null}
      <div role="radiogroup" aria-label={ariaLabel} className="space-y-1.5">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`min-h-12 w-full border-2 px-3 py-2 text-left disabled:opacity-50 ${
                selected
                  ? "border-highlight bg-highlight-soft text-highlight"
                  : "border-border bg-surface-deep text-ink hover:border-brand-blue"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold uppercase tracking-wide">
                  {option.title}
                </span>
                {option.badge}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {option.description}
                </span>
              ) : null}
              {option.footer ? (
                <span className="mt-0.5 block text-xs text-ink-dim">
                  {option.footer}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
