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

function emptyHud(surface: "radar" | "measuring", overrides?: Partial<AskHudReadiness>) {
  const readiness: AskHudReadiness = {
    surface,
    placementReady: false,
    configureReady: false,
    resolveReady: surface === "radar",
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
    ...overrides,
  };
  return {
    readiness,
    costLabel: surface === "radar" ? "D2P1" : "D3P1",
    error: null,
    onCommit: vi.fn(),
    modeBody: (
      <div
        data-testid={
          surface === "radar" ? "radar-hud-body" : "measuring-hud-body"
        }
      />
    ),
    sheets: null,
  };
}

function stubTools(active: "radar" | "measuring" | "matching") {
  return {
    radarTool: {
      panel: <div data-testid="radar-float-panel" />,
      hud: emptyHud("radar"),
    },
    measuringTool: {
      panel: <div data-testid="measuring-float-panel" />,
      hud: emptyHud("measuring"),
    },
    matchingTool: { panel: <div data-testid="matching-float-panel" /> },
    photoTool: { panel: <div /> },
    thermometerTool: { panel: <div /> },
    pinTool: { panel: <div /> },
    zoneTool: { panel: <div /> },
    tentacleTool: { panel: <div /> },
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

  it("keeps ToolFloatingPanel for non-migrated matching and hides AskHudHost stub", () => {
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

    expect(screen.queryByTestId("ask-hud-host")).toBeNull();
    expect(screen.getByTestId("matching-float-panel")).toBeInTheDocument();
  });
});
