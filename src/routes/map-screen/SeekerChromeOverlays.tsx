import { MapFirstRunSheet } from "../../components/session/MapFirstRunSheet";
import { MapToolsHintBanner } from "../../components/session/MapToolsHintBanner";
import { ToolFloatingPanel } from "../../components/tools/ToolFloatingPanel";
import type { MapScreenController } from "./useMapScreenController";

type SeekerChromeOverlaysProps = {
  timer: MapScreenController["timer"];
  activeTool: MapScreenController["activeTool"];
  overlay: MapScreenController["overlay"];
  firstRunDismissed: MapScreenController["firstRunDismissed"];
  setFirstRunDismissed: MapScreenController["setFirstRunDismissed"];
  selectedAnnotation: MapScreenController["selectedAnnotation"];
  geometryEditAnnotation: MapScreenController["geometryEditAnnotation"];
  geometryDraft: MapScreenController["geometryDraft"];
  mapPanning: MapScreenController["mapPanning"];
  userMinimized: MapScreenController["userMinimized"];
  setUserMinimized: MapScreenController["setUserMinimized"];
  handleSelectTool: MapScreenController["handleSelectTool"];
  cancelGeometryEdit: MapScreenController["cancelGeometryEdit"];
  saveGeometryEdit: MapScreenController["saveGeometryEdit"];
  tools: Pick<
    MapScreenController,
    | "radarTool"
    | "photoTool"
    | "thermometerTool"
    | "matchingTool"
    | "measuringTool"
    | "pinTool"
    | "zoneTool"
    | "tentacleTool"
  >;
};

function renderToolPanel(
  activeTool: MapScreenController["activeTool"],
  tools: SeekerChromeOverlaysProps["tools"],
) {
  switch (activeTool) {
    case "radar":
      return tools.radarTool.panel;
    case "zone":
      return tools.zoneTool.panel;
    case "thermometer":
      return tools.thermometerTool.panel;
    case "matching":
      return tools.matchingTool.panel;
    case "measuring":
      return tools.measuringTool.panel;
    case "pin":
      return tools.pinTool.panel;
    case "tentacle":
      return tools.tentacleTool.panel;
    case "photo":
      return tools.photoTool.panel;
    case "none":
      return null;
    default: {
      const _exhaustive: never = activeTool;
      return _exhaustive;
    }
  }
}

export function SeekerChromeOverlays({
  timer,
  activeTool,
  overlay,
  firstRunDismissed,
  setFirstRunDismissed,
  selectedAnnotation,
  geometryEditAnnotation,
  geometryDraft,
  mapPanning,
  userMinimized,
  setUserMinimized,
  handleSelectTool,
  cancelGeometryEdit,
  saveGeometryEdit,
  tools,
}: SeekerChromeOverlaysProps) {
  return (
    <>
      <MapToolsHintBanner
        hidden={
          !timer.hasStarted ||
          activeTool !== "none" ||
          overlay.isSettingsOpen ||
          Boolean(selectedAnnotation) ||
          Boolean(geometryEditAnnotation && geometryDraft)
        }
      />

      {geometryEditAnnotation && geometryDraft ? (
        <div className="pointer-events-auto absolute inset-x-0 jl-panel-above-dock jl-panel-enter z-[var(--z-panel)] px-3">
          <div className="hud-panel mx-auto flex max-w-xl gap-2 p-3">
            <button
              type="button"
              onClick={() => void saveGeometryEdit()}
              className="btn-primary min-h-12 flex-1"
            >
              Save shape
            </button>
            <button
              type="button"
              onClick={cancelGeometryEdit}
              className="btn-secondary min-h-12 flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <MapFirstRunSheet
        open={
          !timer.hasStarted &&
          !firstRunDismissed &&
          overlay.sheet === "none" &&
          activeTool === "none" &&
          !selectedAnnotation &&
          !geometryEditAnnotation
        }
        onDismiss={() => setFirstRunDismissed(true)}
      />

      {activeTool !== "none" && !selectedAnnotation ? (
        <ToolFloatingPanel
          key={activeTool}
          toolId={activeTool}
          mapPanning={mapPanning}
          userMinimized={userMinimized}
          onMinimizedChange={setUserMinimized}
          onClose={() => handleSelectTool("none")}
        >
          {renderToolPanel(activeTool, tools)}
        </ToolFloatingPanel>
      ) : null}
    </>
  );
}
