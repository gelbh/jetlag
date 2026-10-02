import { UnstyledButton } from "@mantine/core";
import {
  choiceChipStyles,
  segmentBtnStyle,
  segmentChipsTrackStyle,
  segmentControlTrackStyle,
} from "@/components/ui/entry/entryChrome";

interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

interface SegmentControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentOption<Value>[];
  onChange: (value: Value) => void;
  variant?: "hud" | "pill" | "chips";
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
  if (variant === "chips") {
    return (
      <div
        className="jl-scroll"
        style={segmentChipsTrackStyle}
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
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              data-feedback="tap"
              style={{
                ...segmentBtnStyle(selected),
                flex: "0 0 auto",
                whiteSpace: "nowrap",
              }}
              className="disabled:opacity-50"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

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
                selected ? "bg-flag-soft text-flag" : "text-field-ink-muted"
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
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <UnstyledButton
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              aria-pressed={selected}
              styles={choiceChipStyles(selected, "default")}
            >
              {option.label}
            </UnstyledButton>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        ...segmentControlTrackStyle,
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      }}
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
            data-feedback="tap"
            style={segmentBtnStyle(selected)}
            className="disabled:opacity-50"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
