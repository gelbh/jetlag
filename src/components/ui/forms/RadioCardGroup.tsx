import type { ReactNode } from "react";
import { Box, Text, UnstyledButton } from "@mantine/core";
import { IosInsetGroup, IosSectionLabel } from "@/components/ui/apple/iosEntryChrome";
import { IosInsetHairline } from "@/components/ui/apple/IosInsetRow";

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
      {label ? <IosSectionLabel>{label}</IosSectionLabel> : null}
      <IosInsetGroup>
        <div role="radiogroup" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = value === option.value;

            return (
              <Box key={option.value}>
                {index > 0 ? <IosInsetHairline insetStart="1rem" /> : null}
                <UnstyledButton
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(option.value)}
                  styles={{
                    root: {
                      display: "block",
                      width: "100%",
                      minHeight: "2.875rem",
                      paddingInline: "1rem",
                      paddingBlock: "0.7rem",
                      textAlign: "left",
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      backgroundColor: selected
                        ? "oklch(from var(--color-flag) l c h / 0.12)"
                        : "transparent",
                    },
                  }}
                >
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Text
                      size="sm"
                      fw={selected ? 600 : 510}
                      c={
                        selected
                          ? "var(--color-flag)"
                          : "var(--color-field-ink)"
                      }
                    >
                      {option.title}
                    </Text>
                    {option.badge}
                  </Box>
                  {option.description ? (
                    <Text
                      size="xs"
                      mt={4}
                      c="var(--color-field-ink-muted)"
                      lh={1.35}
                    >
                      {option.description}
                    </Text>
                  ) : null}
                  {option.footer ? (
                    <Text
                      size="xs"
                      mt={2}
                      c="var(--color-field-ink-muted)"
                    >
                      {option.footer}
                    </Text>
                  ) : null}
                </UnstyledButton>
              </Box>
            );
          })}
        </div>
      </IosInsetGroup>
    </div>
  );
}
