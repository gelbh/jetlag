import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeekerChromeOverlays } from "./SeekerChromeOverlays";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";

function stubTimer() {
  return { hasStarted: true };
}

function stubOverlay() {
  return { isSettingsOpen: false, sheet: "none" as const };
}

function emptyHud(
  surface:
    | "radar"
    | "measuring"
    | "matching"
    | "tentacle"
    | "thermometer"
    | "photo",
  overrides?: Partial<AskHudReadiness>,
) {
  const readiness: AskHudReadiness = {
    surface,
    placementReady: false,
    configureReady: false,
    resolveReady: surface === "radar" || surface === "photo",
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
    ...overrides,
  };
  const bodyId =
    surface === "radar"
      ? "radar-hud-body"
      : surface === "measuring"
        ? "measuring-hud-body"
        : surface === "matching"
          ? "matching-hud-body"
          : surface === "tentacle"
            ? "tentacle-hud-body"
            : surface === "thermometer"
              ? "thermometer-hud-body"
              : "photo-hud-body";
  return {
    readiness,
    costLabel:
      surface === "radar" || surface === "thermometer"
        ? "D2P1"
        : surface === "photo"
          ? "D1P1"
          : surface === "tentacle"
            ? "D4P2"
            : "D3P1",
    error: null,
    onCommit: vi.fn(),
    modeBody: <div data-testid={bodyId} />,
    sheets: null,
    ...(surface === "thermometer" ? { commitKind: "endWalk" as const } : {}),
  };
}

function stubTools(
  active:
    | "radar"
    | "measuring"
    | "matching"
    | "tentacle"
    | "thermometer"
    | "photo",
) {
  return {
    radarTool: {
      panel: <div data-testid="radar-float-panel" />,
      hud: emptyHud("radar"),
    },
    measuringTool: {
      panel: <div data-testid="measuring-float-panel" />,
      hud: emptyHud("measuring"),
    },
    matchingTool: {
      panel: <div data-testid="matching-float-panel" />,
      hud: emptyHud("matching"),
    },
    photoTool: {
      panel: <div data-testid="photo-float-panel" />,
      hud: emptyHud("photo"),
    },
    thermometerTool: {
      panel: <div data-testid="thermometer-float-panel" />,
      hud: emptyHud("thermometer"),
    },
    pinTool: { panel: <div /> },
    zoneTool: { panel: <div /> },
    tentacleTool: {
      panel: <div data-testid="tentacle-float-panel" />,
      hud: emptyHud("tentacle"),
    },
    _active: active,
  };
}

describe("SeekerChromeOverlays Ask HUD wiring", () => {
  it("mounts AskHudHost for radar and skips ToolFloatingPanel", () => {
    const tools = stubTools("radar");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="radar"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "TAP MAP TO SET CENTER",
    );
    expect(screen.queryByTestId("radar-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for measuring and skips ToolFloatingPanel", () => {
    const tools = stubTools("measuring");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="measuring"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("measuring-hud-body")).toBeInTheDocument();
    expect(screen.queryByTestId("measuring-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for matching CatalogRail and skips ToolFloatingPanel", () => {
    const tools = stubTools("matching");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="matching"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("matching-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "PICK CATEGORY",
    );
    expect(screen.queryByTestId("matching-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for tentacle CatalogRail and skips ToolFloatingPanel", () => {
    const tools = stubTools("tentacle");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="tentacle"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("tentacle-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "PICK TYPES",
    );
    expect(screen.queryByTestId("tentacle-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for thermometer and skips ToolFloatingPanel", () => {
    const tools = stubTools("thermometer");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="thermometer"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("thermometer-hud-body")).toBeInTheDocument();
    expect(screen.queryByTestId("thermometer-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for photo and skips ToolFloatingPanel", () => {
    const tools = stubTools("photo");
    render(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="photo"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        setForceMapToolsGuide={vi.fn()}
        selectedAnnotation={null}
        geometryEditAnnotation={null}
        geometryDraft={null}
        mapPanning={false}
        userMinimized={false}
        setUserMinimized={vi.fn()}
        handleSelectTool={vi.fn()}
        cancelGeometryEdit={vi.fn()}
        saveGeometryEdit={vi.fn()}
        tools={tools as never}
      />,
    );

    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("photo-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "PICK A PHOTO ASK",
    );
    expect(screen.queryByTestId("photo-float-panel")).toBeNull();
  });
});
