import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  MATCHING_CATEGORIES,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "@/domain/questions";
import { AskHudHost } from "./AskHudHost";
import { MatchingHudBody } from "./MatchingHudBody";
import {
  activeModeCue,
  canCommit,
  primedCommitLabel,
  type AskHudReadiness,
} from "@/domain/ask/askHudModes";

const baseProps = {
  distanceUnit: "imperial" as DistanceUnit,
  categoryId: null as MatchingCategoryId | null,
  categoryChosen: false,
  usedCategoryIds: new Set<MatchingCategoryId>(),
  catalogCategories: MATCHING_CATEGORIES,
  hasSeekerPoint: false,
  usesContainmentMatching: false,
  nearestFeatureName: null as string | null,
  distanceMeters: null as number | null,
  featureCount: null as number | null,
  inPlayAreaFeatureCount: null as number | null,
  nearestOutsidePlayArea: false,
  nullAnswer: false,
  loading: false,
  gpsLoading: false,
  answer: null as MatchingAnswer | null,
  onCategoryChange: vi.fn(),
  onUseGps: vi.fn(),
  onAnswerChange: vi.fn(),
  awaitHiderAnswer: true,
};

describe("MatchingHudBody", () => {
  it("shows catalog rail without PhaseRail or CONTINUE; row select advances", () => {
    const onCategoryChange = vi.fn();
    render(
      <MatchingHudBody {...baseProps} onCategoryChange={onCategoryChange} />,
    );

    expect(screen.getByTestId("matching-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Wizard phases" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Commercial Airport/i }));
    expect(onCategoryChange).toHaveBeenCalledWith("commercial_airport");
  });

  it("after category, shows resolve chord without CONTINUE strip sibling", () => {
    render(
      <MatchingHudBody
        {...baseProps}
        categoryChosen
        categoryId="commercial_airport"
        hasSeekerPoint
      />,
    );

    expect(screen.queryByTestId("ask-catalog-rail")).toBeNull();
    expect(screen.getByTestId("matching-hud-body")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).toBeNull();
  });

  it("wires cue ticker and muted strip until canCommit", () => {
    const readiness: AskHudReadiness = {
      surface: "matching",
      placementReady: true,
      configureReady: true,
      resolveReady: false,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    const cue = activeModeCue({
      surface: "matching",
      placementReady: true,
      configureReady: true,
      resolveReady: false,
    });
    expect(cue).toBe("RESOLVE ON MAP");
    expect(canCommit(readiness)).toBe(false);

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Matching"
        costLabel="D3P1"
        canCommit={false}
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D3P1",
          primed: false,
          cue,
        })}
        onCommit={() => {}}
        modeBody={
          <MatchingHudBody
            {...baseProps}
            categoryChosen
            categoryId="commercial_airport"
            hasSeekerPoint
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "RESOLVE ON MAP",
    );
    expect(
      screen.getByRole("button", { name: "SEND — RESOLVE ON MAP" }),
    ).toBeDisabled();
  });

  it("arms PrimedCommitStrip only when canCommit", () => {
    const readiness: AskHudReadiness = {
      surface: "matching",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
      answerReady: true,
      awaitHiderAnswer: true,
      isSubmitting: false,
    };
    expect(canCommit(readiness)).toBe(true);
    const cue = activeModeCue({
      surface: "matching",
      placementReady: true,
      configureReady: true,
      resolveReady: true,
    });
    const onCommit = vi.fn();

    render(
      <AskHudHost
        cue={cue}
        toolLabel="Matching"
        costLabel="D3P1"
        canCommit
        commitLabel={primedCommitLabel({
          kind: "send",
          costLabel: "D3P1",
          primed: true,
          cue,
        })}
        onCommit={onCommit}
        modeBody={
          <MatchingHudBody
            {...baseProps}
            categoryChosen
            categoryId="commercial_airport"
            hasSeekerPoint
            nearestFeatureName="Dublin Airport"
            distanceMeters={1200}
          />
        }
      />,
    );

    expect(screen.getByTestId("ask-mode-cue-ticker")).toHaveTextContent(
      "READY TO SEND",
    );
    const strip = screen.getByRole("button", { name: "SEND · D3P1" });
    expect(strip).toHaveAttribute("data-armed", "true");
    fireEvent.click(strip);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
