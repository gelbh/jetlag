import type { CSSProperties } from "react";

/** Wide admin map: course header and map in column 1, rail spanning column 2. */
export function adminShellStyle({
  isWide,
  railCollapsed,
  embedded,
}: {
  isWide: boolean;
  railCollapsed: boolean;
  embedded: boolean;
}): CSSProperties {
  // cqi, not %: resolves against the monitor pane (its container), not the grid.
  const railWidth = railCollapsed
    ? "var(--ops-rail-collapsed-width)"
    : embedded
      ? "min(var(--ops-rail-width), 50cqi)"
      : "var(--ops-rail-width)";
  return {
    // Embedded in the course region instead of the player shell's fixed viewport frame.
    ...(embedded ? { position: "absolute", inset: 0, minHeight: 0 } : null),
    ...(isWide
      ? {
          display: "grid",
          gridTemplateColumns: `minmax(0, 1fr) minmax(0, ${railWidth})`,
          gridTemplateRows: "auto minmax(0, 1fr)",
        }
      : null),
  };
}

export const adminShellCell = {
  top: { gridColumn: 1, gridRow: 1, minWidth: 0, zIndex: "var(--z-dock)" },
  // contain: layout makes the map cell the fixed containing block for map chrome docks.
  map: {
    gridColumn: 1,
    gridRow: 2,
    position: "relative",
    minWidth: 0,
    minHeight: 0,
    contain: "layout",
  },
  rail: { gridColumn: 2, gridRow: "1 / -1", minWidth: 0, minHeight: 0, zIndex: "var(--z-panel)" },
} satisfies Record<string, CSSProperties>;
