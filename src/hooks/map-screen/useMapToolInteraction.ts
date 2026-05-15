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
          radarTool.handleMapClick(point);
          return;
        case "zone":
          zoneTool.handleMapClick(point);
          return;
        case "thermometer":
          thermometerTool.handleMapClick(point);
          return;
        case "pin":
          pinTool.handleMapClick(point);
          return;
        case "measuring":
          measuringTool.handleMapClick(point);
          return;
        case "matching":
          matchingTool.handleMapClick(point);
          return;
        case "tentacle":
          tentacleTool.handleMapClick(point);
      }
    },
    [
      activeTool,
      ensurePointInGameArea,
      geometryEditActive,
      handleGeometryEditClick,
      matchingTool,
      measuringTool,
      pinTool,
      radarTool,
      setSelectedAnnotationId,
      tentacleTool,
      thermometerTool,
      zoneTool,
    ],
  );

  return { handleMapClick };
}
