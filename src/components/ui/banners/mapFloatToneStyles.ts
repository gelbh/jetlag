import { jetlagBrand } from "@/theme/theme";

export type MapFloatTone = "default" | "flag" | "halt" | "warn" | "info";

const toneAccent: Record<MapFloatTone, string> = {
  default: jetlagBrand.highlight,
  flag: jetlagBrand.flag,
  halt: jetlagBrand.halt,
  warn: jetlagBrand.signal,
  info: jetlagBrand.trail,
};

export const toneAlertColor: Record<MapFloatTone, string> = {
  default: "gray",
  flag: "flag",
  halt: "halt",
  warn: "yellow",
  info: "teal",
};

/**
 * Frosted canvas body + accent border/title for map floats and halt alerts.
 * Avoid accent-at-0.12 fills over live map (outdoor body copy fails contrast).
 */
export function floatToneStyles(tone: MapFloatTone) {
  const accent = toneAccent[tone];
  return {
    root: {
      backgroundColor: `oklch(from ${jetlagBrand.canvas} l c h / 0.92)`,
      border: `${jetlagBrand.hairline} solid oklch(from ${accent} l c h / 0.45)`,
      boxShadow: jetlagBrand.floatShadow,
      backdropFilter: jetlagBrand.frostBlur,
      WebkitBackdropFilter: jetlagBrand.frostBlur,
    },
    title: {
      color: accent,
    },
    message: {
      color: jetlagBrand.fieldInk,
    },
  } as const;
}
