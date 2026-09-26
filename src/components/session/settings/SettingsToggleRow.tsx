import { useId } from "react";
import { Box, Switch, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { InsetHairline } from "@/components/ui/entry/InsetRow";

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Hairline above this row when stacked in an inset group. */
  showSeparator?: boolean;
  /** Optional leading mark (e.g. layer color swatch). */
  leading?: ReactNode;
}

/** Inset toggle row: plain label + Mantine Switch (Survey flag when on). */
export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  showSeparator = false,
  leading,
}: SettingsToggleRowProps) {
  const switchId = useId();

  return (
    <>
      {showSeparator ? <InsetHairline insetStart="1rem" /> : null}
      <Box
        component="label"
        htmlFor={switchId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          width: "100%",
          minHeight: "2.875rem",
          paddingInline: "1rem",
          paddingBlock: description ? "0.625rem" : "0.5rem",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {leading ? (
          <Box
            component="span"
            aria-hidden
            style={{ display: "inline-flex", flexShrink: 0 }}
          >
            {leading}
          </Box>
        ) : null}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            component="span"
            style={{
              display: "block",
              fontSize: "1.0625rem",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              color: "var(--color-field-ink)",
              lineHeight: 1.25,
            }}
          >
            {label}
          </Text>
          {description ? (
            <Text
              component="span"
              style={{
                display: "block",
                marginTop: "0.2rem",
                fontSize: "0.8125rem",
                lineHeight: 1.35,
                color: "var(--color-field-ink-muted)",
              }}
            >
              {description}
            </Text>
          ) : null}
        </Box>
        <Switch
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
          size="md"
          color="var(--color-flag)"
          aria-label={label}
          styles={{
            track: {
              cursor: disabled ? "not-allowed" : "pointer",
              minWidth: "2.75rem",
              minHeight: "1.75rem",
            },
          }}
        />
      </Box>
    </>
  );
}
