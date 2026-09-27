import type { ReactNode } from "react";
import { MapFloatSurface } from "./MapFloatSurface";

interface MapFloatAlertProps {
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
  "aria-live"?: "polite" | "assertive" | "off";
}

export function MapFloatAlert({
  children,
  className,
  role = "status",
  "aria-live": ariaLive = "polite",
}: MapFloatAlertProps) {
  return (
    <MapFloatSurface
      tone="default"
      role={role}
      aria-live={ariaLive}
      className={className}
    >
      {children}
    </MapFloatSurface>
  );
}

interface MapFloatAlertPanelProps {
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}

export function MapFloatAlertPanel({
  children,
  className,
  role = "alert",
}: MapFloatAlertPanelProps) {
  return (
    <MapFloatSurface tone="halt" role={role} className={className} actionRow>
      {children}
    </MapFloatSurface>
  );
}
