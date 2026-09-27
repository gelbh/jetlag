import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";

export function HiderOutsideZoneAlert() {
  return (
    <MapFloatSurface
      tone="warn"
      role="status"
      aria-live="polite"
      className="pointer-events-auto mx-3 mt-1.5 text-sm font-semibold"
    >
      You&apos;re outside your hiding zone. Use a move card to relocate.
    </MapFloatSurface>
  );
}
