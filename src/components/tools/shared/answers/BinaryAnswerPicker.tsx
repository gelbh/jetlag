import { ChoiceButton } from "@/components/ui/forms/ChoiceButton";
import { binaryAnswerIcon } from "./binaryAnswerIcons";

interface BinaryAnswerOption<Value extends string> {
  value: Value;
  label: string;
  activeClassName: string;
}

interface BinaryAnswerPickerProps<Value extends string> {
  value: Value | null;
  options: readonly [BinaryAnswerOption<Value>, BinaryAnswerOption<Value>];
  onChange: (value: Value) => void;
  label?: string;
  disabledValues?: ReadonlySet<Value>;
}

export function BinaryAnswerPicker<Value extends string>({
  value,
  options,
  onChange,
  label = "Answer",
  disabledValues,
}: BinaryAnswerPickerProps<Value>) {
  return (
    <div className="space-y-2" data-wizard-no-swipe>
      {label ? <p className="field-label m-0">{label}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const disabled = disabledValues?.has(option.value) ?? false;
          const Icon = binaryAnswerIcon(option.value);
          const selected = value === option.value;

          return (
            <ChoiceButton
              key={option.value}
              selected={selected}
              activeClassName={option.activeClassName}
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className="disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
            >
              {Icon ? <Icon size={16} weight={selected ? "bold" : "regular"} aria-hidden /> : null}
              {option.label}
            </ChoiceButton>
          );
        })}
      </div>
    </div>
  );
}
