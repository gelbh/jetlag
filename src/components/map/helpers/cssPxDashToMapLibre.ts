/** Leaflet CSS-px dash string → MapLibre line-dasharray (multiples of line width). */
export function cssPxDashToMapLibre(
  dash: string | undefined,
  lineWidth: number,
): number[] | undefined {
  if (!dash) {
    return undefined;
  }
  const width = lineWidth > 0 ? lineWidth : 1;
  const parts = dash
    .split(/\s+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => n / width);
  return parts.length > 0 ? parts : undefined;
}
