import { MapFirstRunSheet } from "../../components/session/mapChrome/MapFirstRunSheet";
import { MapToolsHintBanner } from "../../components/session/mapChrome/MapToolsHintBanner";
import { AskHudHost } from "../../components/tools/ask/AskHudHost";
import { ToolFloatingPanel } from "../../components/tools/ToolFloatingPanel";
import {
  activeModeCue,
  canCommit,
  commitKind,
  isAskHudOwnedTool,
  primedCommitLabel,
  type AskHudSurface,
} from "../../domain/ask/askHudModes";
import type { AskToolHudBundle } from "../../hooks/map-screen/heavyMapTools";
import { MAP_TOOL_DOCK_ENTRIES } from "../../domain/map/mapTools";
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

function askHudFromTools(
  activeTool: AskHudSurface,
  tools: SeekerChromeOverlaysProps["tools"],
): AskToolHudBundle | null {
  switch (activeTool) {
    case "radar":
      return tools.radarTool.hud;
    case "measuring":
      return tools.measuringTool.hud;
    case "matching":
      return tools.matchingTool.hud;
    case "tentacle":
      return tools.tentacleTool.hud;
    case "thermometer":
      return tools.thermometerTool.hud;
    case "photo":
      return tools.photoTool.hud;
    case "hiding-zone-create":
    case "hiding-zone-move":
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
  const askHudOwned =
    activeTool !== "none" &&
    isAskHudOwnedTool(activeTool) &&
    !selectedAnnotation;

  const askSurface: AskHudSurface | null = askHudOwned ? activeTool : null;
  const dockEntry = askHudOwned
    ? MAP_TOOL_DOCK_ENTRIES.find((entry) => entry.id === activeTool)
    : undefined;
  const toolHud = askSurface ? askHudFromTools(askSurface, tools) : null;

  const askCue = toolHud
    ? activeModeCue({
        surface: toolHud.readiness.surface,
        placementReady: toolHud.readiness.placementReady,
        configureReady: toolHud.readiness.configureReady,
        resolveReady: toolHud.readiness.resolveReady,
      })
    : "";
  const askCanCommit = toolHud ? canCommit(toolHud.readiness) : false;
  const askCommitKind = toolHud
    ? (toolHud.commitKind ??
      commitKind(
        toolHud.readiness.surface,
        toolHud.readiness.awaitHiderAnswer,
      ))
    : "send";
  const askCommitLabel = toolHud
    ? primedCommitLabel({
        kind: askCommitKind,
        costLabel: toolHud.costLabel,
        primed: askCanCommit,
        cue: askCue,
      })
    : "";

  const showFloatingPanel =
    activeTool !== "none" &&
    !selectedAnnotation &&
    !isAskHudOwnedTool(activeTool);

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

      {askHudOwned && askSurface && toolHud ? (
        <>
          <AskHudHost
            cue={askCue}
            toolLabel={dockEntry?.name ?? activeTool}
            costLabel={toolHud.costLabel}
            canCommit={askCanCommit}
            commitLabel={askCommitLabel}
            onCommit={toolHud.onCommit}
            isSubmitting={toolHud.readiness.isSubmitting}
            error={toolHud.error}
            modeBody={toolHud.modeBody}
          />
          {toolHud.sheets}
        </>
      ) : null}

      {showFloatingPanel ? (
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
