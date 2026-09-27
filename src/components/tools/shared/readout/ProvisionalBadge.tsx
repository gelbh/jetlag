/** Distinguishes tile preview candidates from Overpass/bundle-confirmed places. */
export function ProvisionalBadge() {
  return (
    <span
      style={{
        marginLeft: "0.5rem",
        display: "inline-flex",
        borderRadius: 6,
        padding: "0.125rem 0.375rem",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.75rem",
        fontWeight: 590,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.12)",
        color: "var(--color-field-ink-muted)",
      }}
    >
      Preview
    </span>
  );
}
