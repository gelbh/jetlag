import { useCallback } from "react";
import type { LatLngTuple } from "../../domain/geometry";
import type { MapTool } from "../../domain/mapToolTypes";

interface ToolMapClickHandler {
  handleMapClick: (point: LatLngTuple) => void;
}

interface UseMapToolInteractionParams {
  activeTool: MapTool;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  handleGeometryEditClick: (point: LatLngTuple) => boolean;
  geometryEditActive: boolean;
  setSelectedAnnotationId: (id: string | null) => void;
  radarTool: ToolMapClickHandler;
  thermometerTool: ToolMapClickHandler;
  measuringTool: ToolMapClickHandler;
  matchingTool: ToolMapClickHandler;
  tentacleTool: ToolMapClickHandler;
  pinTool: ToolMapClickHandler;
  zoneTool: ToolMapClickHandler;
}

export function useMapToolInteraction({
  activeTool,
  ensurePointInGameArea,
  handleGeometryEditClick,
  geometryEditActive,
  setSelectedAnnotationId,
  radarTool,
  thermometerTool,
  measuringTool,
  matchingTool,
  tentacleTool,
  pinTool,
  zoneTool,
}: UseMapToolInteractionParams) {
  const radarMapClick = radarTool.handleMapClick;
  const thermometerMapClick = thermometerTool.handleMapClick;
  const measuringMapClick = measuringTool.handleMapClick;
  const matchingMapClick = matchingTool.handleMapClick;
  const tentacleMapClick = tentacleTool.handleMapClick;
  const pinMapClick = pinTool.handleMapClick;
  const zoneMapClick = zoneTool.handleMapClick;

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const point: LatLngTuple = [lat, lng];

      if (geometryEditActive) {
        handleGeometryEditClick(point);
        return;
      }

      if (activeTool === "none") {
        setSelectedAnnotationId(null);
        return;
      }

      if (!ensurePointInGameArea(point)) {
        return;
      }

      switch (activeTool) {
        case "radar":
          radarMapClick(point);
          return;
        case "zone":
          zoneMapClick(point);
          return;
        case "thermometer":
          thermometerMapClick(point);
          return;
        case "pin":
          pinMapClick(point);
          return;
        case "measuring":
          measuringMapClick(point);
          return;
        case "matching":
          matchingMapClick(point);
          return;
        case "tentacle":
          tentacleMapClick(point);
      }
    },
    [
      activeTool,
      ensurePointInGameArea,
      geometryEditActive,
      handleGeometryEditClick,
      matchingMapClick,
      measuringMapClick,
      pinMapClick,
      radarMapClick,
      setSelectedAnnotationId,
      tentacleMapClick,
      thermometerMapClick,
      zoneMapClick,
    ],
  );

  return { handleMapClick };
}
