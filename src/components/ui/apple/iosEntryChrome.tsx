import { Box } from "@mantine/core";
import type { ReactNode } from "react";
import {
  iosBottomDrawerStyles,
  iosChoiceChipStyles,
  iosCompactDangerStyles,
  iosCompactFilledStyles,
  iosCompactGrayStyles,
  iosFilledStyles,
  iosGrayStyles,
  iosInsetTextInputStyles,
  iosInsetTextareaStyles,
  iosMapIslandFilledStyles,
  iosMapIslandIconStyles,
  iosMapToolSlotLabelStyle,
  iosMapToolSlotStyles,
  iosPlainStyles,
} from "@/components/ui/apple/iosEntryStyles";
import type {
  IosChoiceTone,
  IosMapToolSlotTone,
} from "@/components/ui/apple/iosEntryStyles";

/** Re-export button/drawer styles so map chrome callers keep one import path. */
export {
  iosBottomDrawerStyles,
  iosChoiceChipStyles,
  iosCompactDangerStyles,
  iosCompactFilledStyles,
  iosCompactGrayStyles,
  iosFilledStyles,
  iosGrayStyles,
  iosInsetTextInputStyles,
  iosInsetTextareaStyles,
  iosMapIslandFilledStyles,
  iosMapIslandIconStyles,
  iosMapToolSlotLabelStyle,
  iosMapToolSlotStyles,
  iosPlainStyles,
};
export type { IosChoiceTone, IosMapToolSlotTone };

/** Frosted inset grouped list / form surface. */
export function IosInsetGroup({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <Box
      className="jl-ios-inset-group"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: error
          ? "oklch(from var(--color-halt) l c h / 0.1)"
          : "oklch(from var(--color-field-ink) l c h / 0.08)",
        border: error
          ? "0.33px solid oklch(from var(--color-halt) l c h / 0.45)"
          : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        transition:
          "background-color 160ms ease, border-color 160ms ease",
      }}
    >
      {children}
    </Box>
  );
}

/** Caption under an inset field (field-level validation). */
export function IosFieldError({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  if (children == null || children === false || children === "") {
    return null;
  }
  return (
    <Box
      component="p"
      id={id}
      role="alert"
      style={{
        margin: 0,
        paddingInline: 4,
        fontSize: "0.8125rem",
        fontWeight: 510,
        lineHeight: 1.35,
        color: "var(--color-halt)",
      }}
    >
      {children}
    </Box>
  );
}

/** Soft banner for join/submit failures (not a heavy Alert title block). */
export function IosErrorCallout({ children }: { children: ReactNode }) {
  if (children == null || children === false || children === "") {
    return null;
  }
  return (
    <Box
      role="alert"
      style={{
        borderRadius: 12,
        padding: "0.75rem 1rem",
        backgroundColor: "oklch(from var(--color-halt) l c h / 0.14)",
        border: "0.33px solid oklch(from var(--color-halt) l c h / 0.35)",
      }}
    >
      <Box
        component="p"
        style={{
          margin: 0,
          fontSize: "0.9375rem",
          fontWeight: 510,
          lineHeight: 1.35,
          color: "var(--color-halt)",
          textWrap: "pretty",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Transient success banner (no @mantine/notifications). */
export function IosSuccessCallout({ children }: { children: ReactNode }) {
  if (children == null || children === false || children === "") {
    return null;
  }
  return (
    <Box
      role="status"
      style={{
        borderRadius: 12,
        padding: "0.75rem 1rem",
        backgroundColor: "oklch(from var(--color-trail) l c h / 0.14)",
        border: "0.33px solid oklch(from var(--color-trail) l c h / 0.35)",
      }}
    >
      <Box
        component="p"
        style={{
          margin: 0,
          fontSize: "0.9375rem",
          fontWeight: 510,
          lineHeight: 1.35,
          color: "var(--color-trail)",
          textWrap: "pretty",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function IosSectionLabel({ children }: { children: ReactNode }) {
  return (
    <Box
      component="p"
      style={{
        margin: 0,
        paddingInline: 4,
        fontSize: "0.8125rem",
        fontWeight: 590,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--color-field-ink-muted)",
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Shared frosted map chrome (status island, dock, chip, ask).
 * Quiet elevation so the map stays the hero.
 */
export const iosMapChromeSurfaceStyles = {
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
  border: "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
  backdropFilter: "blur(24px) saturate(1.35)",
  WebkitBackdropFilter: "blur(24px) saturate(1.35)",
  boxShadow: "0 4px 14px 0 oklch(0.1 0.04 265 / 0.28)",
} as const;

/** Status instrument: shared chrome + Survey ink. */
export const iosMapStatusIslandStyles = {
  ...iosMapChromeSurfaceStyles,
  color: "var(--color-field-ink)",
} as const;

/** Hunt deck: frosted island without Survey flag top bar (Approach B). */
export const iosMapHuntSurfaceStyles = {
  ...iosMapChromeSurfaceStyles,
} as const;

/** Inset strip wrapping question tools inside the hunt deck. */
export const iosMapHuntQuestionStripStyles = {
  display: "flex",
  flex: 1,
  minWidth: 0,
  alignItems: "stretch",
  gap: 2,
  borderRadius: 12,
  padding: 2,
  backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
} as const;

/** Drag affordance for iOS bottom drawers. */
export function IosDrawerGrabber() {
  return (
    <Box
      aria-hidden
      mx="auto"
      style={{
        width: 36,
        height: 5,
        borderRadius: 999,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.28)",
      }}
    />
  );
}
