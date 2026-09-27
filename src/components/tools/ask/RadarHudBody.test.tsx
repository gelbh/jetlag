import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { jetlagTheme } from "@/theme/theme";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { RadarDistanceOptionKey } from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { RadarHudBody } from "./RadarHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseBodyProps = {
  radiusMeters: null as number | null,
  chooseCustom: false,
  customRadius: "",
  awaitingPlacement: true,
  hasCenter: false,
  distanceUnit: "imperial" as DistanceUnit,
  gameSize: "medium" as GameSize,
  usedDistanceOptions: new Set<RadarDistanceOptionKey>(),
  answer: null as "yes" | "no" | null,
  onPresetSelect: vi.fn(),
  onChooseSelect: vi.fn(),
  onCustomRadiusChange: vi.fn(),
  onAnswerChange: vi.fn(),
  onUseGps: vi.fn(),
  onPlaceAtMapTap: vi.fn(),
  gpsLoading: false,
  awaitHiderAnswer: true,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("RadarHudBody", () => {
  it("types custom distance inside Choose with unit and digits only", () => {
    const onChooseSelect = vi.fn();
    const onCustomRadiusChange = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <RadarHudBody
          {...baseBodyProps}
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={onCustomRadiusChange}
          chooseCustom
          customRadius=""
          editingDistance
        />
      </MantineProvider>,
    );

    const input = screen.getByTestId("radar-choose-distance-input");
    expect(screen.getByText("mi")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "2a.5x" } });
    expect(onCustomRadiusChange).toHaveBeenCalledWith("2.5");
  });

  it("keeps catalog open while typing custom distance until commit", () => {
    const onCustomDistanceCommit = vi.fn();
    const onCustomRadiusChange = vi.fn();
    const onChooseSelect = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <RadarHudBody
          {...baseBodyProps}
          chooseCustom
          customRadius="1"
          editingDistance
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={onCustomRadiusChange}
          onCustomDistanceCommit={onCustomDistanceCommit}
        />
      </MantineProvider>,
    );

    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    const input = screen.getByTestId("radar-choose-distance-input");
    fireEvent.change(input, { target: { value: "12" } });
    expect(onCustomRadiusChange).toHaveBeenCalledWith("12");
    expect(onCustomDistanceCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCustomDistanceCommit).toHaveBeenCalledTimes(1);

    onCustomDistanceCommit.mockClear();
    fireEvent.click(screen.getByTestId("radar-choose-distance-commit"));
    expect(onCustomDistanceCommit).toHaveBeenCalledTimes(1);
  });

  it("renders chip island chrome without PhaseRail or CONTINUE wizard nav", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <RadarHudBody {...baseBodyProps} />
      </MantineProvider>,
    );

    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("wires GlanceVerb cue + primed strip via AskHudHost readiness", () => {
    const readiness: AskHudReadiness = {
      surface: "radar",
      placementReady: true,
      configureReady: false,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "radar",
      placementReady: readiness.placementReady,
      configureReady: readiness.configureReady,
      resolveReady: readiness.resolveReady,
    });
    expect(cue).toBe("");
    expect(canCommit(readiness)).toBe(false);

    const onCommit = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost
          cue={cue}
          toolLabel="Radar"
          costLabel="D2P1"
          canCommit={canCommit(readiness)}
          commitLabel={primedCommitLabel({
            kind: "send",
            costLabel: "D2P1",
            primed: false,
            cue,
          })}
          onCommit={onCommit}
          showCostChip={false}
          showCue={false}
          showCommitStrip={false}
          modeBody={
            <RadarHudBody
              {...baseBodyProps}
              hasCenter
              awaitingPlacement={false}
              radiusMeters={1609}
            />
          }
        />
      </MantineProvider>,
    );

    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-cost-chip")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("is commit-ready when center + distance ready (multiplayer; map-first owns send)", () => {
    const readiness: AskHudReadiness = {
      surface: "radar",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "radar",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    expect(canCommit(readiness)).toBe(true);

    const onCommit = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AskHudHost
          cue={cue}
          toolLabel="Radar"
          costLabel="D2P1"
          canCommit
          commitLabel={primedCommitLabel({
            kind: "send",
            costLabel: "D2P1",
            primed: true,
            cue,
          })}
          onCommit={onCommit}
          showCostChip={false}
          showCue={false}
          showCommitStrip={false}
          modeBody={
            <RadarHudBody
              {...baseBodyProps}
              hasCenter
              awaitingPlacement={false}
              radiusMeters={1609}
            />
          }
        />
      </MantineProvider>,
    );

    expect(cue).toBe("READY TO SEND");
    expect(
      primedCommitLabel({
        kind: "send",
        costLabel: "D2P1",
        primed: true,
        cue,
      }),
    ).toBe("SEND · D2P1");
    expect(screen.queryByTestId("ask-mode-cue-ticker")).toBeNull();
    expect(screen.queryByTestId("ask-cost-chip")).toBeNull();
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
  });
});
