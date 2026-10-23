import { Box, SegmentedControl } from "@mantine/core";

export interface AdminSegmentedOption {
  value: string;
  label: string;
  badge?: number;
}

/** Comp `.segc`: ground track, 3px padding, 12px radius, selected `--color-flag-soft`. */
export function AdminSegmented({
  value,
  onChange,
  data,
  fullWidth,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  data: AdminSegmentedOption[];
  fullWidth?: boolean;
  "aria-label": string;
}) {
  return (
    <SegmentedControl
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      fullWidth={fullWidth}
      radius={12}
      data={data.map((option) => ({
        value: option.value,
        label: (
          <Box component="span" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {option.label}
            {option.badge != null && (
              <Box
                component="span"
                style={{
                  minWidth: 22,
                  height: 20,
                  padding: "0 6px",
                  display: "inline-grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "var(--color-flag)",
                  color: "var(--color-flag-ink)",
                  borderRadius: 10,
                }}
              >
                {option.badge}
              </Box>
            )}
          </Box>
        ),
      }))}
      styles={{
        root: {
          background: "var(--color-surface-deep)",
          border: "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)",
          borderRadius: 12,
          padding: 3,
        },
        indicator: { background: "var(--color-flag-soft)", borderRadius: 9, boxShadow: "none" },
        label: {
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9,
          fontWeight: 500,
          color: "var(--color-ink-secondary)",
          padding: "0 12px",
        },
      }}
      vars={() => ({
        root: {
          "--sc-color": "var(--color-flag-soft)",
          "--sc-label-color": "var(--color-ink)",
        },
      })}
    />
  );
}
