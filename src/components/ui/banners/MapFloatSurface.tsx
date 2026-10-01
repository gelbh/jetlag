import { Alert, Paper } from "@mantine/core";
import type { ReactNode } from "react";
import { jetlagBrand } from "@/theme/theme";
import {
  floatToneStyles,
  toneAlertColor,
  type MapFloatTone,
} from "./mapFloatToneStyles";

export type { MapFloatTone };

export type MapFloatSurfaceProps = {
  tone: MapFloatTone;
  title?: ReactNode;
  children: ReactNode;
  role?: "status" | "alert" | "dialog" | "region";
  "aria-live"?: "polite" | "assertive" | "off";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "data-testid"?: string;
  className?: string;
  /** Paper path: copy + actions side-by-side (MapFloatAlertPanel). */
  actionRow?: boolean;
};

/**
 * Shared Mantine float chrome for map / HudBanner surfaces.
 * Compact status uses Alert; unconstrained children (question card, action rows) use Paper.
 */
export function MapFloatSurface({
  tone,
  title,
  children,
  role,
  "aria-live": ariaLive,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "data-testid": dataTestId,
  className,
  actionRow = false,
}: MapFloatSurfaceProps) {
  const styles = floatToneStyles(tone);
  const a11y = {
    role,
    "aria-live": ariaLive,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "data-testid": dataTestId,
    "data-map-float-surface": "true",
  };

  // Paper when callers need unconstrained children (no title → panel / card body).
  if (title == null) {
    return (
      <Paper
        radius={jetlagBrand.controlRadius}
        p="sm"
        className={className}
        styles={{
          root: {
            ...styles.root,
            ...(actionRow
              ? {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }
              : null),
          },
        }}
        {...a11y}
      >
        {children}
      </Paper>
    );
  }

  return (
    <Alert
      color={toneAlertColor[tone]}
      title={title}
      variant="light"
      className={className}
      styles={styles}
      {...a11y}
    >
      {children}
    </Alert>
  );
}
