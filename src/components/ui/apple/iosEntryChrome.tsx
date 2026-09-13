import { Box, type ButtonProps } from "@mantine/core";
import type { ReactNode } from "react";

/** iOS filled tint control (logo orange). */
export const iosFilledStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "3.125rem",
    borderRadius: 14,
    border: "none",
    fontWeight: 590,
    backgroundColor: "var(--color-flag)",
    color: "var(--color-flag-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) calc(l + 0.03) c h)",
    },
  },
};

/** iOS gray / secondary filled control. */
export const iosGrayStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "3.125rem",
    borderRadius: 14,
    border: "none",
    fontWeight: 590,
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-field-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
    },
  },
};

/** iOS plain tinted text control. */
export const iosPlainStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.75rem",
    borderRadius: 14,
    border: "none",
    backgroundColor: "transparent",
    color: "var(--color-flag)",
    fontWeight: 510,
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) l c h / 0.12)",
    },
  },
};

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
export function IosFieldError({ children }: { children: ReactNode }) {
  if (children == null || children === false || children === "") {
    return null;
  }
  return (
    <Box
      component="p"
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
