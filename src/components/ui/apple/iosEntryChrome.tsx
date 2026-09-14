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

/** Compact flag control for inset list rows (friends, presets). */
export const iosCompactFilledStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "var(--color-flag)",
    color: "var(--color-flag-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) calc(l + 0.03) c h)",
    },
  },
};

/** Compact gray / secondary control for inset list rows. */
export const iosCompactGrayStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-field-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
    },
  },
};

/** Compact halt-tinted control for destructive row actions. */
export const iosCompactDangerStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-halt)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
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

/** Full-bleed bottom Drawer chassis (Friends / Leaderboard / report sheets). */
export function iosBottomDrawerStyles(maxHeight = "min(70dvh, 34rem)") {
  return {
    inner: {
      width: "100%",
      maxWidth: "100%",
      padding: 0,
    },
    content: {
      flex: "0 0 100%",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      maxHeight,
      backgroundColor: "var(--color-canvas)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
      overflow: "auto" as const,
    },
    body: {
      width: "100%",
      paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
    },
  };
}

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
