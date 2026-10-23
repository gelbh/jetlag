import type { ReactNode } from "react";
import { useMapSideDockSide } from "@/hooks/map/useMapSideDockSide";
import { MapDraggableFixedStack } from "./MapDraggableFixedStack";

type MapSideDockStackProps = {
  children: ReactNode;
  className?: string;
};

export function MapSideDockStack({ children, className }: MapSideDockStackProps) {
  const { placement, setPlacement } = useMapSideDockSide();

  return (
    <MapDraggableFixedStack
      placement={placement}
      setPlacement={setPlacement}
      className={className}
      testId="map-side-dock-stack"
      ariaLabel="Session tools. Drag to reposition."
      chromeRole="side"
    >
      {children}
    </MapDraggableFixedStack>
  );
}
