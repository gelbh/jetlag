import { MapFloatAlert } from "../../ui/MapFloatAlert";

export function HiderOutsideZoneAlert() {
  return (
    <MapFloatAlert
      className="pointer-events-auto mx-3 mt-1.5 border-status-warning/40 bg-status-warning-surface normal-case tracking-normal text-status-warning"
    >
      You&apos;re outside your hiding zone. Use a move card to relocate.
    </MapFloatAlert>
  );
}
