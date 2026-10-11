import { Box, Text } from "@mantine/core";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { LearnShowcaseId } from "@/domain/learn/learnContentTypes";
import { ANALYTICS_EVENTS } from "@/services/core/analytics/analyticsEvents";
import { trackLazy } from "@/services/core/analytics/lazyTelemetry";

const frameStyle: CSSProperties = {
  border: "1px solid var(--color-rule)",
  borderRadius: "0.75rem",
  backgroundColor: "var(--color-canvas)",
  padding: "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const labelStyle: CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-field-ink-muted)",
  margin: 0,
};

const captionStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.9375rem",
  lineHeight: 1.45,
  color: "var(--color-field-ink)",
  textWrap: "pretty",
};

/** Stake-plate frame for live Ask HUD demos on learn pages. */
export function LearnShowcaseFrame({
  showcase,
  caption,
  children,
}: {
  showcase: LearnShowcaseId;
  caption: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const trackedRef = useRef(false);

  // Capture phase: demo handlers may stop propagation.
  const trackFirstInteraction = () => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackLazy(ANALYTICS_EVENTS.learn_showcase_interacted, { showcase, path: pathname });
  };

  return (
    <Box
      component="figure"
      data-testid="learn-showcase"
      style={frameStyle}
      aria-label={caption}
      onPointerDownCapture={trackFirstInteraction}
      onKeyDownCapture={trackFirstInteraction}
    >
      <Text component="p" style={labelStyle}>
        Try it
      </Text>
      <Box style={{ minWidth: 0 }}>{children}</Box>
      <Text component="figcaption" style={captionStyle}>
        {caption}
      </Text>
    </Box>
  );
}
