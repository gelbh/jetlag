import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AskHudCommitKind, AskHudReadiness } from "@/domain/ask/askHudModes";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import { SeekerChromeOverlays } from "./SeekerChromeOverlays";

function stubTimer() {
  return { hasStarted: true };
}

function stubOverlay() {
  return { isSettingsOpen: false, sheet: "none" as const };
}

function emptyHud(
  surface: "radar" | "measuring" | "matching" | "tentacle" | "thermometer" | "photo",
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
    error: null as string | null,
    onCommit: vi.fn(),
    modeBody: <div data-testid={bodyId} />,
    sheets: null,
    ...(surface === "thermometer" ? { commitKind: "send" as AskHudCommitKind } : {}),
  };
}

function stubTools(
  active: "radar" | "measuring" | "matching" | "tentacle" | "thermometer" | "photo",
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
    drawTool: { panel: <div /> },
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
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="radar"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("radar-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for measuring and skips ToolFloatingPanel", () => {
    const tools = stubTools("measuring");
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="measuring"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="matching"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    // Matching embeds cue/cost in the question box; host cue + commit strip stay off.
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("tool-floating-panel")).toBeNull();
    expect(screen.queryByTestId("matching-float-panel")).toBeNull();
  });

  it("does not surface location errors or SEND — PICK CATEGORY on Matching catalog", () => {
    const tools = stubTools("matching");
    tools.matchingTool.hud = {
      ...tools.matchingTool.hud,
      error: "Current location is unavailable.",
    };
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="matching"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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

    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("ask-inline-error")).toBeNull();
    expect(screen.queryByText(/PICK CATEGORY/i)).toBeNull();
    expect(screen.queryByText(/Location unavailable/i)).toBeNull();
  });

  it("hides host cue / cost / commit for Measuring catalog like Matching", () => {
    const tools = stubTools("measuring");
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="measuring"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByText(/SET YOUR ANCHOR/i)).toBeNull();
  });

  it("mounts AskHudHost for tentacle CatalogRail and skips ToolFloatingPanel", () => {
    const tools = stubTools("tentacle");
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="tentacle"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    // Tentacle embeds cue/cost in the question box like Matching.
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("tentacle-float-panel")).toBeNull();
  });

  it("mounts AskHudHost for thermometer and skips ToolFloatingPanel", () => {
    const tools = stubTools("thermometer");
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="thermometer"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-cost-chip")).toBeNull();
    // Setup uses map-first answer chrome; END WALK strip only while walking.
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("thermometer-float-panel")).toBeNull();
  });

  it("shows END WALK commit strip only while thermometer is walking", () => {
    const tools = stubTools("thermometer");
    tools.thermometerTool.hud = {
      ...tools.thermometerTool.hud,
      commitKind: "endWalk",
      readiness: {
        ...tools.thermometerTool.hud.readiness,
        placementReady: true,
        configureReady: true,
        resolveReady: true,
        answerReady: true,
      },
    };
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="thermometer"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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

    expect(screen.getByTestId("ask-commit-strip")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /end walk/i })).toBeInTheDocument();
  });

  it("mounts AskHudHost for photo and skips ToolFloatingPanel", () => {
    const tools = stubTools("photo");
    renderWithAppUi(
      <SeekerChromeOverlays
        timer={stubTimer() as never}
        activeTool="photo"
        overlay={stubOverlay() as never}
        firstRunDismissed
        setFirstRunDismissed={vi.fn()}
        forceMapToolsGuide={false}
        onDismissMapToolsGuide={vi.fn()}
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
    // Photo embeds cue/cost in the question box like Matching.
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByTestId("photo-float-panel")).toBeNull();
  });

  it("keeps AskHudHost mounted with open false when ask tool clears", () => {
    const tools = stubTools("radar");
    const baseProps = {
      timer: stubTimer() as never,
      overlay: stubOverlay() as never,
      firstRunDismissed: true as const,
      setFirstRunDismissed: vi.fn(),
      forceMapToolsGuide: false,
      onDismissMapToolsGuide: vi.fn(),
      selectedAnnotation: null,
      geometryEditAnnotation: null,
      geometryDraft: null,
      mapPanning: false,
      userMinimized: false,
      setUserMinimized: vi.fn(),
      handleSelectTool: vi.fn(),
      cancelGeometryEdit: vi.fn(),
      saveGeometryEdit: vi.fn(),
      tools: tools as never,
    };

    const { rerender } = renderWithAppUi(
      <SeekerChromeOverlays {...baseProps} activeTool="radar" />,
    );
    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();

    rerender(<SeekerChromeOverlays {...baseProps} activeTool="none" />);
    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
    expect(screen.queryByTestId("radar-hud-body")).toBeNull();
  });

  it("drops preview sheets on tool clear without clone-holding a closed preview", () => {
    const tools = stubTools("radar");
    tools.radarTool.hud = {
      ...tools.radarTool.hud,
      sheets: <div data-testid="radar-preview-sheet" />,
    };
    const baseProps = {
      timer: stubTimer() as never,
      overlay: stubOverlay() as never,
      firstRunDismissed: true as const,
      setFirstRunDismissed: vi.fn(),
      forceMapToolsGuide: false,
      onDismissMapToolsGuide: vi.fn(),
      selectedAnnotation: null,
      geometryEditAnnotation: null,
      geometryDraft: null,
      mapPanning: false,
      userMinimized: false,
      setUserMinimized: vi.fn(),
      handleSelectTool: vi.fn(),
      cancelGeometryEdit: vi.fn(),
      saveGeometryEdit: vi.fn(),
      tools: tools as never,
    };

    const { rerender } = renderWithAppUi(
      <SeekerChromeOverlays {...baseProps} activeTool="radar" />,
    );
    expect(screen.getByTestId("radar-preview-sheet")).toBeInTheDocument();

    rerender(<SeekerChromeOverlays {...baseProps} activeTool="none" />);
    expect(screen.queryByTestId("radar-preview-sheet")).toBeNull();
    expect(screen.getByTestId("ask-hud-host")).toBeInTheDocument();
  });
});
