type AskInlineErrorProps = {
  message: string;
  id?: string;
};

type ErrorCopy = {
  title: string;
  detail: string;
};

/** Friendlier titles for common GPS / ask failures shown in sheets. */
export function askInlineErrorCopy(message: string): ErrorCopy {
  const lower = message.toLowerCase();
  if (
    lower.includes("timed out") ||
    lower.includes("waiting for your location")
  ) {
    return {
      title: "Location timed out",
      detail:
        "GPS took too long to respond. Move outdoors for a clearer signal, try again, or tap the map to place your anchor.",
    };
  }
  if (lower.includes("blocked") || lower.includes("allow location")) {
    return {
      title: "Location blocked",
      detail: message,
    };
  }
  if (
    lower.includes("location unavailable") ||
    lower.includes("could not find a fix") ||
    (lower.includes("unavailable") && lower.includes("location"))
  ) {
    return {
      title: "Location unavailable",
      detail:
        "Your device could not find a fix. Try again, or tap the map to place your anchor.",
    };
  }
  return {
    title: "Couldn’t finish that step",
    detail: message,
  };
}

/** True when the message should get GPS-style title + detail treatment. */
export function isLocationInlineError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("timed out") ||
    lower.includes("waiting for your location") ||
    lower.includes("blocked") ||
    lower.includes("allow location") ||
    lower.includes("location unavailable") ||
    (lower.includes("unavailable") && lower.includes("location"))
  );
}

/**
 * Soft iOS-style inline error for Ask sheets and related HUD panels.
 * Replaces bare `text-halt` paragraphs.
 */
export function AskInlineError({ message, id }: AskInlineErrorProps) {
  const { title, detail } = askInlineErrorCopy(message);

  return (
    <div
      id={id}
      role="alert"
      data-testid="ask-inline-error"
      data-player-ux-world="mantine"
      style={{
        borderRadius: 14,
        padding: "0.75rem 0.875rem",
        backgroundColor: "oklch(from var(--color-canvas) l c h / 0.96)",
        border: "0.33px solid oklch(from var(--color-halt) l c h / 0.4)",
        backdropFilter: "blur(20px) saturate(1.25)",
        WebkitBackdropFilter: "blur(20px) saturate(1.25)",
        boxShadow: "0 4px 16px 0 oklch(0.12 0.04 25 / 0.18)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: 650,
          color: "var(--color-halt)",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "0.25rem 0 0",
          fontSize: "0.8125rem",
          lineHeight: 1.35,
          color: "var(--color-field-ink)",
        }}
      >
        {detail}
      </p>
    </div>
  );
}
