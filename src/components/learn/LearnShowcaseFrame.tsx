import { Box, Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

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
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <Box component="figure" data-testid="learn-showcase" style={frameStyle} aria-label={caption}>
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
