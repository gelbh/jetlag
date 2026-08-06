import { MapFirstRunSheet } from "../../components/session/mapChrome/MapFirstRunSheet";
import { MapToolsHintBanner } from "../../components/session/mapChrome/MapToolsHintBanner";
import { AskHudHost } from "../../components/tools/ask/AskHudHost";
import { ToolFloatingPanel } from "../../components/tools/ToolFloatingPanel";
import {
  activeModeCue,
  commitKind,
  type AskHudCommitKind,
  type AskHudSurface,
} from "../../domain/ask/askHudModes";
import {
  isQuestionDockTool,
  MAP_TOOL_DOCK_ENTRIES,
} from "../../domain/map/mapTools";
import type { MapScreenController } from "./useMapScreenController";

type SeekerChromeOverlaysProps = {
  timer: MapScreenController["timer"];
  activeTool: MapScreenController["activeTool"];
  overlay: MapScreenController["overlay"];
  firstRunDismissed: MapScreenController["firstRunDismissed"];
  setFirstRunDismissed: MapScreenController["setFirstRunDismissed"];
  forceMapToolsGuide: boolean;
  setForceMapToolsGuide: (open: boolean) => void;
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

function stubCommitLabel(kind: AskHudCommitKind): string {
  switch (kind) {
    case "send":
      return "SEND — SET CENTER FIRST";
    case "ask":
      return "ASK — NOT READY";
    case "confirm":
      return "CONFIRM — NOT READY";
    case "endWalk":
      return "END WALK — NOT READY";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

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
  forceMapToolsGuide,
  setForceMapToolsGuide,
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
  const askHudActive =
    activeTool !== "none" &&
    isQuestionDockTool(activeTool) &&
    !selectedAnnotation;

  const askSurface: AskHudSurface | null = askHudActive ? activeTool : null;
  const dockEntry = askHudActive
    ? MAP_TOOL_DOCK_ENTRIES.find((entry) => entry.id === activeTool)
    : undefined;
  const askCue = askSurface
    ? activeModeCue({
        surface: askSurface,
        placementReady: false,
        configureReady: false,
        resolveReady: false,
      })
    : "";
  const askCommitKind = askSurface
    ? commitKind(askSurface, true)
    : "send";

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
          forceMapToolsGuide ||
          (!timer.hasStarted &&
            !firstRunDismissed &&
            overlay.sheet === "none" &&
            activeTool === "none" &&
            !selectedAnnotation &&
            !geometryEditAnnotation)
        }
        forceOpen={forceMapToolsGuide}
        onDismiss={() => {
          setFirstRunDismissed(true);
          setForceMapToolsGuide(false);
        }}
      />

      {askHudActive && askSurface ? (
        <AskHudHost
          cue={askCue}
          toolLabel={dockEntry?.name ?? activeTool}
          costLabel={dockEntry?.cost ?? null}
          canCommit={false}
          commitLabel={stubCommitLabel(askCommitKind)}
          onCommit={() => {
            /* Task 2 scaffold — tool panels still own commit. */
          }}
          modeBody={null}
        />
      ) : null}

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
