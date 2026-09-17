import { useId, useState, type ReactNode } from "react";
import { Button, TextInput, UnstyledButton } from "@mantine/core";
import { CaretDown } from "@phosphor-icons/react";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosGrayStyles,
  iosInsetTextInputStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";

interface AdvancedSettingsCategoryProps {
  title: string;
  children: ReactNode;
  /** Defaults to open so existing long forms stay scannable. */
  defaultOpen?: boolean;
}

/** Collapsible category for Game advanced rules groups. */
export function AdvancedSettingsCategory({
  title,
  children,
  defaultOpen = true,
}: AdvancedSettingsCategoryProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="space-y-2">
      <UnstyledButton
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        styles={{
          root: {
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            minHeight: "2.5rem",
            paddingInline: 4,
            paddingBlock: 4,
            borderRadius: 8,
            color: "var(--color-field-ink-muted)",
          },
        }}
      >
        <IosSectionLabel>{title}</IosSectionLabel>
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </UnstyledButton>
      <div id={panelId} hidden={!open} className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/** @deprecated Prefer AdvancedSettingsCategory for Game rules. */
export function AdvancedSettingsSectionHeader({
  title,
}: {
  title: string;
  bordered?: boolean;
}) {
  return <IosSectionLabel>{title}</IosSectionLabel>;
}

interface AdvancedSettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  showSeparator?: boolean;
}

export function AdvancedSettingsToggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  showSeparator = false,
}: AdvancedSettingsToggleProps) {
  return (
    <SettingsToggleRow
      label={label}
      description={description}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      showSeparator={showSeparator}
    />
  );
}

interface ToggleNumberWithPresetsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  toggleLabel: string;
  toggleDescription?: string;
  numberLabel: string;
  numberValue: number;
  onNumberChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  inputMode?: "numeric" | "decimal";
  presets: readonly { label: string; value: number }[];
}

export function ToggleNumberWithPresets({
  enabled,
  onEnabledChange,
  disabled = false,
  toggleLabel,
  toggleDescription,
  numberLabel,
  numberValue,
  onNumberChange,
  min,
  max,
  step,
  inputMode = "numeric",
  presets,
}: ToggleNumberWithPresetsProps) {
  return (
    <IosInsetGroup>
      <AdvancedSettingsToggle
        checked={enabled}
        onChange={onEnabledChange}
        disabled={disabled}
        label={toggleLabel}
        description={toggleDescription}
      />
      {enabled ? (
        <div className="space-y-2 px-0 pb-3">
          <TextInput
            label={numberLabel}
            type="number"
            min={min}
            max={max}
            step={step}
            value={numberValue}
            disabled={disabled}
            inputMode={inputMode}
            autoComplete="off"
            onChange={(event) => {
              const parsed =
                inputMode === "decimal"
                  ? Number.parseFloat(event.currentTarget.value)
                  : Number.parseInt(event.currentTarget.value, 10);
              if (!Number.isFinite(parsed)) {
                return;
              }
              onNumberChange(parsed);
            }}
            styles={iosInsetTextInputStyles}
          />
          <div className="flex flex-wrap gap-2 px-4">
            {presets.map((preset) => (
              <PresetButton
                key={preset.label}
                label={preset.label}
                disabled={disabled}
                onClick={() => onNumberChange(preset.value)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </IosInsetGroup>
  );
}

export function SectionSummary({ text }: { text: string }) {
  return (
    <p className="text-xs text-[var(--color-field-ink-muted)]">{text}</p>
  );
}

export function PresetButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="compact-sm"
      disabled={disabled}
      onClick={onClick}
      styles={iosGrayStyles}
    >
      {label}
    </Button>
  );
}

/** Wrap one or more toggle rows in the shared inset surface. */
export function AdvancedSettingsInset({ children }: { children: ReactNode }) {
  return <IosInsetGroup>{children}</IosInsetGroup>;
}
