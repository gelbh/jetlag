import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { TentacleHudBody } from "./TentacleHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseProps = {
  gameSize: "medium" as GameSize,
  categoryId: null as TentacleExtendedCategoryId | null,
  categoryChosen: false,
  searchRadiusMeters: 1609,
  usedCategoryIds: new Set<TentacleExtendedCategoryId>(),
  distanceUnit: "imperial" as DistanceUnit,
  poiOptions: [] as TentaclePoi[],
  selectedPoiId: null as string | null,
  outOfReach: false,
  loading: false,
  awaitingPlacement: true,
  hasCenter: false,
  gpsLoading: false,
  onCategoryChange: vi.fn(),
  onUseGps: vi.fn(),
  onPlaceAtMapTap: vi.fn(),
  onSelectPoi: vi.fn(),
  onOutOfReachChange: vi.fn(),
  awaitHiderAnswer: true,
};

describe("TentacleHudBody", () => {
  it("shows catalog rail without PhaseRail or CONTINUE; row select advances", () => {
    const onCategoryChange = vi.fn();
    render(
      <TentacleHudBody {...baseProps} onCategoryChange={onCategoryChange} />,
    );

    expect(screen.getByTestId("tentacle-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Museum/i }));
    expect(onCategoryChange).toHaveBeenCalledWith("museum");
  });

  it("after types, shows map-radius place chord without CONTINUE", () => {
    render(
      <TentacleHudBody
        {...baseProps}
        categoryChosen
        categoryId="museum"
        awaitingPlacement
      />,
    );

    expect(screen.queryByTestId("ask-catalog-rail")).toBeNull();
    expect(screen.getByTestId("tentacle-hud-body")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("wires cue ticker and muted strip until canCommit", () => {
    const readiness: AskHudReadiness = {
      surface: "tentacle",
      placementReady: false,
      configureReady: true,
      resolveReady: false,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "tentacle",
      placementReady: false,
      configureReady: true,
      resolveReady: false,
    });
    expect(cue).toBe("SET CENTER ON MAP");
    expect(canCommit(readiness)).toBe(false);

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Tentacles"
        costLabel="D4P2"
        canCommit={false}
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D4P2",
          primed: false,
          cue,
        })}
        onCommit={() => {}}
        modeBody={
          <TentacleHudBody
            {...baseProps}
            categoryChosen
            categoryId="museum"
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "SET CENTER ON MAP",
    );
    expect(
      screen.getByRole("button", { name: "SEND — SET CENTER FIRST" }),
    ).toBeDisabled();
  });

  it("arms PrimedCommitStrip only when canCommit", () => {
    const readiness: AskHudReadiness = {
      surface: "tentacle",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    expect(canCommit(readiness)).toBe(true);
    const cue = activeModeCue({
      surface: "tentacle",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    const onCommit = vi.fn();
    const pois: TentaclePoi[] = [
      {
        id: "poi-1",
        name: "National Museum",
        lat: 53.35,
        lng: -6.26,
        category: "museum",
      },
    ];

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Tentacles"
        costLabel="D4P2"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D4P2",
          primed: true,
          cue,
        })}
        onCommit={onCommit}
        modeBody={
          <TentacleHudBody
            {...baseProps}
            categoryChosen
            categoryId="museum"
            hasCenter
            awaitingPlacement={false}
            poiOptions={pois}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "READY TO SEND",
    );
    const strip = screen.getByRole("button", { name: "SEND · D4P2" });
    expect(strip).toHaveAttribute("data-armed", "true");
    fireEvent.click(strip);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("locations chord respects ask rail max-height shell", () => {
    const pois: TentaclePoi[] = [
      {
        id: "poi-1",
        name: "National Museum",
        lat: 53.35,
        lng: -6.26,
        category: "museum",
      },
      {
        id: "poi-2",
        name: "City Museum",
        lat: 53.36,
        lng: -6.25,
        category: "museum",
      },
    ];
    render(
      <TentacleHudBody
        {...baseProps}
        awaitHiderAnswer={false}
        categoryChosen
        categoryId="museum"
        hasCenter
        awaitingPlacement={false}
        poiOptions={pois}
      />,
    );

    const chord = screen.getByTestId("tentacle-locations-chord");
    expect(chord.className).toMatch(/ask-scroll-chord/);
  });

  it("solo locations chord still lists places and not-within-reach", () => {
    const pois: TentaclePoi[] = [
      {
        id: "poi-1",
        name: "National Museum",
        lat: 53.35,
        lng: -6.26,
        category: "museum",
      },
    ];
    render(
      <TentacleHudBody
        {...baseProps}
        awaitHiderAnswer={false}
        categoryChosen
        categoryId="museum"
        hasCenter
        awaitingPlacement={false}
        poiOptions={pois}
      />,
    );

    expect(screen.getByText("National Museum")).toBeInTheDocument();
    expect(screen.getByText("Not within reach")).toBeInTheDocument();
  });
});
