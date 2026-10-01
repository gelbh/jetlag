/* eslint-disable react-refresh/only-export-components -- helpers share the Ask inline-error copy module with the component */
import { Alert } from "@mantine/core";
import { floatToneStyles } from "@/components/ui/banners/mapFloatToneStyles";

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
 * Soft inline error for Ask sheets and related HUD panels (channel 3).
 */
export function AskInlineError({ message, id }: AskInlineErrorProps) {
  const { title, detail } = askInlineErrorCopy(message);

  return (
    <Alert
      id={id}
      role="alert"
      color="halt"
      variant="light"
      title={title}
      styles={floatToneStyles("halt")}
      data-testid="ask-inline-error"
    >
      {detail}
    </Alert>
  );
}
