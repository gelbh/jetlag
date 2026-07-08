import type { FramingMode } from "../../hooks/session/useGameAreaFraming";

export const FRAMING_MODE_OPTIONS: ReadonlyArray<{
  value: FramingMode;
  label: string;
}> = [
  { value: "rectangle", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "polygon", label: "Polygon" },
];

export function framingModeHint(mode: FramingMode): string {
  switch (mode) {
    case "rectangle":
      return "Pan and zoom. The dashed line is your play boundary.";
    case "circle":
      return "Tap the map for center, then zoom to set radius.";
    case "polygon":
      return "Tap each corner, then close the shape.";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
