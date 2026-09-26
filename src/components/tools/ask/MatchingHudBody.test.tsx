import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  MATCHING_CATEGORIES,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "@/domain/questions";
import { jetlagTheme } from "@/theme/theme";
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

function renderMatching(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

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

describe("MatchingHudBody", () => {
  it("shows matching question prompt and category row icons", () => {
    const { container } = renderMatching(
      <MatchingHudBody {...baseProps} costLabel="D3P1" />,
    );

    expect(
      screen.getByText(
        "Is your nearest [place] the same as my nearest [place]?",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ask-cost-chip")).toHaveTextContent("D3P1");
    expect(screen.queryByText("PICK CATEGORY")).toBeNull();

    const airport = screen.getByRole("button", { name: /Commercial Airport/i });
    expect(airport.querySelector("svg")).not.toBeNull();
    expect(
      container.querySelector(".ask-catalog-rail__grid"),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-testid="ask-catalog-rail"] svg').length,
    ).toBeGreaterThan(3);
  });

  it("shows the real category question once a category is chosen", () => {
    renderMatching(
      <MatchingHudBody
        {...baseProps}
        categoryChosen
        categoryId="commercial_airport"
        hasSeekerPoint
      />,
    );

    expect(
      screen.getByText(
        "Is your nearest commercial airport the same as my nearest commercial airport?",
      ),
    ).toBeInTheDocument();
  });

  it("shows catalog rail without PhaseRail or CONTINUE; row select advances", () => {
    const onCategoryChange = vi.fn();
    renderMatching(
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

  it("filters catalog rows by category group chip", () => {
    renderMatching(<MatchingHudBody {...baseProps} />);

    const filter = screen.getByRole("tablist", {
      name: "Filter match categories",
    });
    expect(filter).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commercial Airport/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Transit" }));
    expect(screen.getByRole("button", { name: /Commercial Airport/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /1st Administrative Division/i }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Admin" }));
    expect(screen.queryByRole("button", { name: /Commercial Airport/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /1st Administrative Division/i }),
    ).toBeInTheDocument();
  });

  it("renders GPS timeout with AskInlineError treatment", () => {
    renderMatching(
      <MatchingHudBody
        {...baseProps}
        categoryChosen
        categoryId="commercial_airport"
        hasSeekerPoint
        error="Timed out while waiting for your location."
      />,
    );

    expect(screen.getByTestId("ask-inline-error")).toBeInTheDocument();
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
  });

  it("after category, shows resolve chord without CONTINUE strip sibling", () => {
    renderMatching(
      <MatchingHudBody
        {...baseProps}
        categoryChosen
        categoryId="commercial_airport"
        hasSeekerPoint
      />,
    );

    expect(screen.queryByTestId("ask-catalog-rail")).toBeNull();
    expect(screen.getByTestId("matching-hud-body")).toBeInTheDocument();
    expect(screen.getByText("Commercial Airport")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
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

    renderMatching(
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
    // Sheet path hides muted SEND footer; cue carries the next-step hint.
    expect(screen.queryByTestId("ask-commit-strip")).toBeNull();
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

    renderMatching(
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
